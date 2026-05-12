<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ProjectController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::apiResource('projects', ProjectController::class);
    Route::post('/projects/{project}/duplicate', [ProjectController::class, 'duplicate']);
    Route::patch('/projects/{project}/favorite', [ProjectController::class, 'favorite']);
    Route::patch('/projects/{project}/last-opened', [ProjectController::class, 'lastOpened']);

    Route::post('/ai/schema-assistant', fn () => response()->json([
        'message' => 'AI endpoint is not implemented yet.',
    ], 501));
});
