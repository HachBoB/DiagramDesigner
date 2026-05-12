<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class SharedProjectController extends Controller
{
    public function show(Request $request, string $token): JsonResponse|ProjectResource
    {
        $project = $this->findSharedProject($token);

        if ($project->share_access === 'password') {
            return response()->json([
                'password_required' => true,
                'name' => $project->name,
                'owner' => [
                    'name' => $project->user?->name,
                ],
            ], 423);
        }

        $this->trackViewer($request, $project);

        return ProjectResource::make($project);
    }

    public function unlock(Request $request, string $token): ProjectResource
    {
        $project = $this->findSharedProject($token);

        abort_unless($project->share_access === 'password', 404);

        $data = $request->validate([
            'password' => ['required', 'string'],
        ]);

        abort_unless(
            $project->share_password_hash && Hash::check($data['password'], $project->share_password_hash),
            403,
            'Неверный пароль для доступа к проекту.'
        );

        $this->trackViewer($request, $project);

        return ProjectResource::make($project);
    }

    public function update(Request $request, string $token): ProjectResource
    {
        $project = $this->findSharedProject($token);

        abort_unless($project->share_permission === 'edit', 403, 'Эта ссылка разрешает только просмотр.');

        if ($project->share_access === 'password') {
            $data = $request->validate([
                'password' => ['required', 'string'],
                'name' => ['sometimes', 'string', 'max:255'],
                'dialect' => ['sometimes', 'string', 'max:50'],
                'schema_code' => ['sometimes', 'nullable', 'string'],
                'schema_json' => ['sometimes', 'nullable', 'array'],
            ]);

            abort_unless(
                $project->share_password_hash && Hash::check($data['password'], $project->share_password_hash),
                403,
                'Неверный пароль для сохранения проекта.'
            );

            unset($data['password']);
        } else {
            $data = $request->validate([
                'name' => ['sometimes', 'string', 'max:255'],
                'dialect' => ['sometimes', 'string', 'max:50'],
                'schema_code' => ['sometimes', 'nullable', 'string'],
                'schema_json' => ['sometimes', 'nullable', 'array'],
            ]);
        }

        $project->update($data);
        $this->trackViewer($request, $project);

        return ProjectResource::make($project->refresh());
    }

    private function findSharedProject(string $token): Project
    {
        $project = Project::query()
            ->with('user')
            ->where('share_token', $token)
            ->whereIn('share_access', ['link', 'password'])
            ->firstOrFail();

        abort_unless($project->isShared(), 404);

        return $project;
    }

    private function trackViewer(Request $request, Project $project): void
    {
        $user = auth('sanctum')->user();

        if ($user?->id === $project->user_id) {
            return;
        }

        if ($user) {
            $project->viewers()->updateOrCreate(
                ['user_id' => $user->id],
                [
                    'viewer_key' => null,
                    'name' => $user->name,
                    'email' => $user->email,
                    'last_viewed_at' => now(),
                ]
            );

            return;
        }

        $viewerKey = hash('sha256', $request->ip().'|'.substr((string) $request->userAgent(), 0, 255));

        $project->viewers()->updateOrCreate(
            ['viewer_key' => $viewerKey],
            [
                'user_id' => null,
                'name' => 'Гость',
                'email' => null,
                'last_viewed_at' => now(),
            ]
        );
    }
}
