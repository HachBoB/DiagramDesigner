<?php

namespace App\Services\Ai;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class NvidiaNimService
{
    public function analyzeSchema(array $payload): array
    {
        $apiKey = config('services.nvidia_nim.key');
        $mode = $payload['mode'] ?? 'review';

        if (! $apiKey) {
            throw new RuntimeException('NVIDIA NIM API key is not configured.');
        }

        $request = Http::withToken($apiKey)
            ->acceptJson()
            ->connectTimeout(config('services.nvidia_nim.connect_timeout'))
            ->timeout(config('services.nvidia_nim.timeout'));

        if (! filter_var(config('services.nvidia_nim.verify_ssl'), FILTER_VALIDATE_BOOLEAN)) {
            $request = $request->withoutVerifying();
        }

        $response = $request->post($this->endpoint('/chat/completions'), [
                'model' => config('services.nvidia_nim.model'),
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

        try {
            $response->throw();
        } catch (RequestException $exception) {
            report($exception);

            throw new RuntimeException('NVIDIA NIM did not return a successful response.');
        }

        $content = data_get($response->json(), 'choices.0.message.content');

        if (! is_string($content) || trim($content) === '') {
            throw new RuntimeException('NVIDIA NIM returned an empty response.');
        }

        if ($mode === 'edit') {
            return [
                ...$this->parseEditResponse($content),
                'model' => config('services.nvidia_nim.model'),
            ];
        }

        return [
            'message' => trim($content),
            'model' => config('services.nvidia_nim.model'),
        ];
    }

    private function endpoint(string $path): string
    {
        return rtrim((string) config('services.nvidia_nim.base_url'), '/').$path;
    }

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

    private function parseEditResponse(string $content): array
    {
        $json = trim($content);
        $json = preg_replace('/^```(?:json)?\s*/i', '', $json);
        $json = preg_replace('/\s*```$/', '', $json);

        if (! str_starts_with($json, '{')) {
            $start = strpos($json, '{');
            $end = strrpos($json, '}');

            if ($start !== false && $end !== false && $end > $start) {
                $json = substr($json, $start, $end - $start + 1);
            }
        }

        $decoded = json_decode($json, true);

        if (! is_array($decoded)) {
            return [
                'message' => trim($content),
                'schema_code' => null,
            ];
        }

        $schemaCode = $decoded['schema_code'] ?? null;

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
