<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Project\ShareProjectRequest;
use App\Http\Resources\ProjectShareResource;
use App\Models\Project;
use App\Models\ProjectViewer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProjectShareController extends Controller
{
    public function show(Request $request, Project $project): ProjectShareResource
    {
        $this->ensureOwnsProject($request, $project);

        return ProjectShareResource::make(
            $project->load(['user', 'viewers'])
        );
    }

    public function update(ShareProjectRequest $request, Project $project): ProjectShareResource
    {
        $this->ensureOwnsProject($request, $project);

        $data = $request->validated();
        $access = $data['access'];

        if ($access === 'private') {
            $project->forceFill([
                'share_access' => 'private',
                'share_permission' => 'view',
                'share_token' => null,
                'share_password_hash' => null,
                'shared_at' => null,
            ])->save();

            return ProjectShareResource::make($project->refresh()->load(['user', 'viewers']));
        }

        $project->share_token ??= $this->newShareToken();
        $project->share_access = $access;
        $project->share_permission = $data['permission'] ?? 'view';
        $project->shared_at ??= now();

        if ($access === 'password') {
            if (filled($data['password'] ?? null)) {
                $project->share_password_hash = Hash::make($data['password']);
            } elseif (! $project->share_password_hash) {
                throw ValidationException::withMessages([
                    'password' => 'Укажите пароль для ссылки.',
                ]);
            }
        } else {
            $project->share_password_hash = null;
        }

        $project->save();

        return ProjectShareResource::make($project->refresh()->load(['user', 'viewers']));
    }

    public function leave(Request $request, Project $project): JsonResponse
    {
        abort_unless($project->user_id !== $request->user()->id, 403);

        $deleted = $project->viewers()
            ->where('user_id', $request->user()->id)
            ->delete();

        abort_unless($deleted > 0, 404);

        return response()->json([
            'message' => 'Вы вышли из командного проекта.',
        ]);
    }

    public function removeViewer(Request $request, Project $project, ProjectViewer $viewer): JsonResponse
    {
        $this->ensureOwnsProject($request, $project);
        abort_unless($viewer->project_id === $project->id, 404);

        $viewer->delete();

        return response()->json([
            'message' => 'Участник удалён из проекта.',
        ]);
    }

    public function updateViewerPermission(Request $request, Project $project, ProjectViewer $viewer): ProjectShareResource
    {
        $this->ensureOwnsProject($request, $project);
        abort_unless($viewer->project_id === $project->id, 404);
        abort_unless($viewer->user_id !== null, 422, 'Права можно менять только пользователям с аккаунтом.');

        $data = $request->validate([
            'permission' => ['required', 'string', 'in:view,edit'],
        ]);

        $viewer->update([
            'permission' => $data['permission'],
        ]);

        return ProjectShareResource::make($project->refresh()->load(['user', 'viewers']));
    }

    private function ensureOwnsProject(Request $request, Project $project): void
    {
        abort_unless($project->user_id === $request->user()->id, 404);
    }

    private function newShareToken(): string
    {
        do {
            $token = Str::random(32);
        } while (Project::where('share_token', $token)->exists());

        return $token;
    }
}
