<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use Throwable;

/**
 * Общается с OpenAI-compatible endpoint NVIDIA NIM для анализа и правок схемы.
 */
class NvidiaNimService
{
    /**
     * Формирует chat completion и приводит ответ модели к контракту frontend-панели.
     */
    public function analyzeSchema(array $payload): array
    {
        $apiKey = config('services.nvidia_nim.key');
        $mode = $payload['mode'] ?? 'review';

        if (! $apiKey) {
            throw new RuntimeException('NVIDIA NIM API key is not configured.');
        }

        // Таймауты вынесены в config, потому что hosted-модели NIM отвечают с разной скоростью.
        $request = Http::withToken($apiKey)
            ->acceptJson()
            ->connectTimeout(config('services.nvidia_nim.connect_timeout'))
            ->timeout(config('services.nvidia_nim.timeout'));

        if (! filter_var(config('services.nvidia_nim.verify_ssl'), FILTER_VALIDATE_BOOLEAN)) {
            $request = $request->withoutVerifying();
        }

        $lastEmptyReason = null;

        foreach ($this->modelsToTry() as $model) {
            for ($attempt = 1; $attempt <= $this->attemptsCount(); $attempt++) {
                $response = $this->sendCompletionRequest($request, $payload, $mode, $model);
                $content = $this->extractTextContent($response->json());

                if (is_string($content) && trim($content) !== '') {
                    // В edit-режиме frontend ждет не только текст, но и полную замену DBML-like кода.
                    if ($mode === 'edit') {
                        return [
                            ...$this->parseEditResponse($content),
                            'model' => $model,
                        ];
                    }

                    return [
                        'message' => trim($content),
                        'model' => $model,
                    ];
                }

                $lastEmptyReason = $this->emptyResponseReason($response->json(), $model, $attempt);
            }
        }

        throw new RuntimeException($lastEmptyReason ?? 'NVIDIA NIM returned an empty response.');
    }

    private function sendCompletionRequest($request, array $payload, string $mode, string $model)
    {
        try {
            // NIM принимает OpenAI-compatible messages, поэтому prompt строится как chat completion.
            $response = $request->post($this->endpoint('/chat/completions'), [
                'model' => $model,
                'temperature' => 0.25,
                'max_tokens' => $mode === 'edit'
                    ? config('services.nvidia_nim.edit_max_tokens')
                    : config('services.nvidia_nim.max_tokens'),
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => $this->systemPrompt($mode),
                    ],
                    [
                        'role' => 'user',
                        'content' => $this->userPrompt($payload),
                    ],
                ],
            ]);
        } catch (Throwable $exception) {
            throw new RuntimeException(
                'Не удалось подключиться к NVIDIA NIM: '.$exception->getMessage(),
                previous: $exception
            );
        }

        try {
            // HTTP-ошибку провайдера превращаем в RuntimeException с коротким телом ответа.
            $response->throw();
        } catch (RequestException $exception) {
            report($exception);

            $body = $response->json();
            $providerMessage = data_get($body, 'error.message')
                ?: data_get($body, 'message')
                ?: $response->body();

            throw new RuntimeException(sprintf(
                'NVIDIA NIM вернул ошибку HTTP %s для модели %s: %s',
                $response->status(),
                $model,
                mb_substr((string) $providerMessage, 0, 700)
            ), previous: $exception);
        }

        return $response;
    }

    private function extractTextContent(?array $body): ?string
    {
        // Основной OpenAI-compatible формат хранит ответ в message.content.
        // choices[0].text оставлен запасным вариантом для моделей с completion-like форматом.
        return data_get($body, 'choices.0.message.content')
            ?: data_get($body, 'choices.0.text');
    }

    private function emptyResponseReason(?array $body, string $model, int $attempt): string
    {
        $finishReason = data_get($body, 'choices.0.finish_reason');
        $usage = data_get($body, 'usage');

        $reason = sprintf(
            'NVIDIA NIM returned an empty response. Model: %s, attempt: %s.',
            $model,
            $attempt
        );

        if ($finishReason) {
            $reason .= ' Finish reason: '.$finishReason.'.';
        }

        if (is_array($usage)) {
            $reason .= ' Usage: '.json_encode($usage, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES).'.';
        }

        $reason .= ' Tried models: '.implode(', ', $this->modelsToTry()).'.';

        return $reason;
    }

    private function attemptsCount(): int
    {
        return max(1, 1 + (int) config('services.nvidia_nim.empty_retries', 1));
    }

    private function modelsToTry(): array
    {
        $models = [
            (string) config('services.nvidia_nim.model'),
            ...array_map('trim', explode(',', (string) config('services.nvidia_nim.fallback_models', ''))),
        ];

        return array_values(array_unique(array_filter($models)));
    }

    private function endpoint(string $path): string
    {
        return rtrim((string) config('services.nvidia_nim.base_url'), '/').$path;
    }

    /**
     * Системный prompt разделяет режим совета и режим правок, чтобы модель не меняла код без запроса.
     */
    private function systemPrompt(string $mode): string
    {
        if ($mode === 'edit') {
            return <<<'PROMPT'
Ты AI-помощник в визуальном редакторе схем баз данных.
Пользователь просит внести правки в DBML-like код схемы.
Верни строго JSON без markdown и без ```:
{
  "message": "коротко объясни, что изменил на русском",
  "schema_code": "полная новая версия DBML-like кода"
}
Требования:
- schema_code должен быть полной версией схемы, а не фрагментом.
- Сохраняй формат Table ... { ... }, Ref ... и Records ... { ... }.
- Не удаляй существующие таблицы, поля, связи или Records без явной причины.
- Не добавляй SQL CREATE TABLE в schema_code; нужен именно DBML-like код редактора.
- Если правки рискованные, сделай минимальные безопасные изменения и объясни это в message.
PROMPT;
        }

        return <<<'PROMPT'
Ты AI-помощник в визуальном редакторе схем баз данных.
Отвечай на русском языке, коротко и по делу.
Ты видишь SQL, DBML-like код и JSON-схему, которые сейчас видит пользователь.
Давай практичные комментарии: ошибки в связях, missing indexes, naming, nullable, PK/FK, нормализация, потенциальные проблемы миграций.
Не переписывай всю схему, если пользователь явно не просит.
Формат ответа:
1. Короткий вывод в 1-2 предложения.
2. 3-6 пунктов с конкретными рекомендациями.
3. Если уместно, маленький пример SQL/DBML, не больше 8 строк.
PROMPT;
    }

    /**
     * Ограничиваем контекст перед отправкой провайдеру, чтобы большая схема не раздула запрос.
     */
    private function userPrompt(array $payload): string
    {
        $question = $payload['question'] ?? 'Проверь текущую схему и дай рекомендации.';
        $schemaCode = mb_substr((string) ($payload['schema_code'] ?? ''), 0, 12000);
        $sql = mb_substr((string) ($payload['sql'] ?? ''), 0, 18000);
        $schemaJson = mb_substr(
            json_encode($payload['schema_json'] ?? [], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
            0,
            12000
        );

        return <<<PROMPT
Запрос пользователя:
{$question}

Проект: {$payload['project_name']}
Диалект SQL: {$payload['dialect']}

DBML-like код:
```dbml
{$schemaCode}
```

SQL, который видит пользователь:
```sql
{$sql}
```

JSON-схема:
```json
{$schemaJson}
```
PROMPT;
    }

    /**
     * NIM-модель иногда оборачивает JSON в markdown, поэтому извлекаем объект максимально терпимо.
     */
    private function parseEditResponse(string $content): array
    {
        $json = trim($content);
        $json = preg_replace('/^```(?:json)?\s*/i', '', $json);
        $json = preg_replace('/\s*```$/', '', $json);

        // Если модель добавила вводный текст, вырезаем крайний JSON object из ответа.
        if (! str_starts_with($json, '{')) {
            $start = strpos($json, '{');
            $end = strrpos($json, '}');

            if ($start !== false && $end !== false && $end > $start) {
                $json = substr($json, $start, $end - $start + 1);
            }
        }

        $decoded = json_decode($json, true);

        // Невалидный JSON не скрываем: показываем пользователю обычный текст ответа без кнопки apply.
        if (! is_array($decoded)) {
            return [
                'message' => trim($content),
                'schema_code' => null,
            ];
        }

        $schemaCode = $decoded['schema_code'] ?? null;

        // Применять можно только полный DBML-like код, а не произвольный фрагмент или SQL.
        if (! is_string($schemaCode) || ! str_contains($schemaCode, 'Table ')) {
            $schemaCode = null;
        }

        return [
            'message' => is_string($decoded['message'] ?? null)
                ? trim($decoded['message'])
                : 'AI подготовил правки.',
            'schema_code' => $schemaCode,
        ];
    }
}
