<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\AiSchemaAssistantController;
use App\Http\Controllers\Api\ProjectController;
use App\Http\Controllers\Api\ProjectShareController;
use App\Http\Controllers\Api\SharedProjectController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);
Route::get('/shared-projects/{token}', [SharedProjectController::class, 'show']);
Route::post('/shared-projects/{token}/unlock', [SharedProjectController::class, 'unlock']);
Route::patch('/shared-projects/{token}', [SharedProjectController::class, 'update']);

Route::middleware('auth:sanctum')->group(function (): void {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    Route::apiResource('projects', ProjectController::class);
    Route::post('/projects/{project}/duplicate', [ProjectController::class, 'duplicate']);
    Route::patch('/projects/{project}/favorite', [ProjectController::class, 'favorite']);
    Route::patch('/projects/{project}/last-opened', [ProjectController::class, 'lastOpened']);
    Route::get('/projects/{project}/share', [ProjectShareController::class, 'show']);
    Route::patch('/projects/{project}/share', [ProjectShareController::class, 'update']);

    Route::post('/ai/schema-assistant', AiSchemaAssistantController::class);
});
