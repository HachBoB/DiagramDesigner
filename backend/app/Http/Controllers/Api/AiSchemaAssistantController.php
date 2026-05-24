<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\SchemaAssistantRequest;
use App\Services\Ai\NvidiaNimService;
use Illuminate\Http\JsonResponse;
use Throwable;

/**
 * Тонкий HTTP-слой над AI-сервисом: валидирует payload и приводит ошибки провайдера к JSON API.
 */
class AiSchemaAssistantController extends Controller
{
    /**
     * Даем запросу к внешней модели чуть больше времени, чем обычному PHP endpoint.
     */
    public function __invoke(SchemaAssistantRequest $request, NvidiaNimService $nvidiaNim): JsonResponse
    {
        @set_time_limit((int) config('services.nvidia_nim.execution_time_limit', 60));

        try {
            return response()->json([
                'data' => $nvidiaNim->analyzeSchema($request->validated()),
            ]);
        } catch (Throwable $exception) {
            // В журнал уходит полный Throwable, а frontend получает контролируемую диагностику.
            report($exception);

            return response()->json($this->errorPayload($exception), 502);
        }
    }

    /**
     * Собирает диагностический ответ для UI, но путь к файлу отдает только в debug-режиме.
     */
    private function errorPayload(Throwable $exception): array
    {
        $payload = [
            'message' => 'AI-помощник сейчас недоступен.',
            'error' => [
                'type' => class_basename($exception),
                'reason' => $exception->getMessage(),
                'provider' => 'NVIDIA NIM',
                'model' => config('services.nvidia_nim.model'),
                'base_url' => config('services.nvidia_nim.base_url'),
            ],
        ];

        if ($exception->getPrevious()) {
            $payload['error']['previous'] = [
                'type' => class_basename($exception->getPrevious()),
                'reason' => $exception->getPrevious()->getMessage(),
            ];
        }

        if (config('app.debug')) {
            $payload['error']['file'] = $exception->getFile();
            $payload['error']['line'] = $exception->getLine();
        }

        return $payload;
    }
}
