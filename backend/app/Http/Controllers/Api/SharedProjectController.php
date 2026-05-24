<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

/**
 * Публичный вход в проект по share token для гостей и авторизованных участников.
 */
class SharedProjectController extends Controller
{
    /**
     * Парольную ссылку сначала открываем в режиме challenge, не отдавая саму схему.
     */
    public function show(Request $request, string $token): JsonResponse|ProjectResource
    {
        $project = $this->findSharedProject($token);

        // До проверки пароля frontend получает только challenge и краткую подпись проекта.
        if ($project->share_access === 'password' && ! $this->hasStoredAccess($request, $project)) {
            return response()->json([
                'password_required' => true,
                'name' => $project->name,
                'owner' => [
                    'name' => $project->user?->name,
                ],
            ], 423);
        }

        $this->trackViewer($request, $project);

        return ProjectResource::make($this->withAccessMeta($request, $project));
    }

    /**
     * После верного пароля сохраняем viewer, чтобы зарегистрированный пользователь видел проект в списке.
     */
    public function unlock(Request $request, string $token): ProjectResource
    {
        $project = $this->findSharedProject($token);

        abort_unless($project->share_access === 'password', 404);

        $data = $request->validate([
            'password' => ['required', 'string'],
        ]);

        // Пароль проверяем до trackViewer, чтобы неверная попытка не попала в команду.
        abort_unless(
            $project->share_password_hash && Hash::check($data['password'], $project->share_password_hash),
            403,
            'Неверный пароль для доступа к проекту.'
        );

        $this->trackViewer($request, $project);

        return ProjectResource::make($this->withAccessMeta($request, $project));
    }

    /**
     * Запись по ссылке разрешена только ссылкам с edit или viewer с персональным edit.
     */
    public function update(Request $request, string $token): ProjectResource
    {
        $project = $this->findSharedProject($token);

        abort_unless($this->canEdit($request, $project), 403, 'У вас нет прав на редактирование этого проекта.');

        if ($project->share_access === 'password') {
            // Для password-link пароль нужен и на сохранение, не только на первое открытие.
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

        // Сохраняем ту же project-модель, что редактирует владелец в обычном editor route.
        $project->update($data);
        $this->trackViewer($request, $project);

        return ProjectResource::make($this->withAccessMeta($request, $project->refresh()));
    }

    /**
     * Ищем только активные ссылки, чтобы приватный проект не открывался по старому токену.
     */
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

    /**
     * Для вошедшего пользователя доступ к парольной ссылке уже хранится в viewers.
     */
    private function hasStoredAccess(Request $request, Project $project): bool
    {
        $user = auth('sanctum')->user();

        return (bool) $user
            && $project->viewers()
                ->where('user_id', $user->id)
                ->exists();
    }

    /**
     * Персональное право viewer сильнее дефолтного права самой share-ссылки.
     */
    private function canEdit(Request $request, Project $project): bool
    {
        $user = auth('sanctum')->user();

        // Владелец всегда редактирует проект независимо от настроек share link.
        if ($user?->id === $project->user_id) {
            return true;
        }

        if ($user) {
            // У вошедшего viewer персональный permission перекрывает дефолт ссылки.
            $viewer = $project->viewers()
                ->where('user_id', $user->id)
                ->first();

            return $viewer
                ? $viewer->permission === 'edit'
                : $project->share_permission === 'edit';
        }

        return $project->share_permission === 'edit';
    }

    /**
     * Возвращает право, которое frontend покажет рядом с ролью участника.
     */
    private function viewerPermission(Request $request, Project $project): string
    {
        $user = auth('sanctum')->user();

        if ($user?->id === $project->user_id) {
            return 'edit';
        }

        if (! $user) {
            return $project->share_permission ?? 'view';
        }

        return $project->viewers()
            ->where('user_id', $user->id)
            ->value('permission') ?? ($project->share_permission ?? 'view');
    }

    /**
     * Добавляет runtime-meta для общего ProjectResource без отдельного формата shared-проекта.
     */
    private function withAccessMeta(Request $request, Project $project): Project
    {
        $permission = $this->viewerPermission($request, $project);

        $project->access_role = auth('sanctum')->id() === $project->user_id ? 'owner' : 'collaborator';
        $project->viewer_permission = $permission;
        $project->can_edit = $this->canEdit($request, $project);
        $project->is_team_project = true;

        return $project;
    }

    /**
     * Авторизованные участники привязываются к user_id, гости получают стабильный fingerprint viewer_key.
     */
    private function trackViewer(Request $request, Project $project): void
    {
        $user = auth('sanctum')->user();

        if ($user?->id === $project->user_id) {
            return;
        }

        if ($user) {
            // Зарегистрированный viewer потом увидит проект на странице "Мои проекты".
            $viewer = $project->viewers()->firstOrNew(['user_id' => $user->id]);

            if (! $viewer->exists) {
                $viewer->permission = $project->share_permission ?? 'view';
            }

            $viewer->fill([
                'viewer_key' => null,
                'name' => $user->name,
                'email' => $user->email,
                'last_viewed_at' => now(),
            ])->save();

            return;
        }

        // Гостю нужен повторяемый ключ, иначе каждый просмотр создал бы нового viewer.
        $viewerKey = hash('sha256', $request->ip().'|'.substr((string) $request->userAgent(), 0, 255));

        $viewer = $project->viewers()->firstOrNew(['viewer_key' => $viewerKey]);

        if (! $viewer->exists) {
            $viewer->permission = $project->share_permission ?? 'view';
        }

        $viewer->fill([
            'user_id' => null,
            'name' => 'Гость',
            'email' => null,
            'last_viewed_at' => now(),
        ])->save();
    }
}
