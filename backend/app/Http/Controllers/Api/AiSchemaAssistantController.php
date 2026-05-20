<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Ai\SchemaAssistantRequest;
use App\Services\Ai\NvidiaNimService;
use Illuminate\Http\JsonResponse;
use Throwable;

class AiSchemaAssistantController extends Controller
{
    public function __invoke(SchemaAssistantRequest $request, NvidiaNimService $nvidiaNim): JsonResponse
    {
        @set_time_limit((int) config('services.nvidia_nim.execution_time_limit', 60));

        try {
            return response()->json([
                'data' => $nvidiaNim->analyzeSchema($request->validated()),
            ]);
        } catch (Throwable $exception) {
            report($exception);

            return response()->json($this->errorPayload($exception), 502);
        }
    }

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
