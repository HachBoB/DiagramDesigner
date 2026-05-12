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

            return response()->json([
                'message' => 'AI-помощник сейчас недоступен. Попробуйте позже.',
            ], 502);
        }
    }
}
