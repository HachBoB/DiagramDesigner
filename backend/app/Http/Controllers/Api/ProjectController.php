<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Project\StoreProjectRequest;
use App\Http\Requests\Project\UpdateProjectRequest;
use App\Http\Resources\ProjectListResource;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Models\ProjectViewer;
use App\Services\DefaultSchemaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/**
 * CRUD проектов и действия, которые доступны владельцу или зарегистрированному участнику.
 */
class ProjectController extends Controller
{
    /**
     * Список смешивает собственные проекты и проекты, куда пользователь уже вошел по ссылке.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        // Собственные проекты идут из связи User -> projects.
        $ownedProjects = $request->user()
            ->projects()
            ->with('user')
            ->withCount('viewers')
            ->get();

        // Командные проекты попадают сюда только после записи пользователя в viewers.
        $sharedProjects = Project::query()
            ->with('user')
            ->withCount('viewers')
            ->whereHas('viewers', fn ($query) => $query->where('user_id', $request->user()->id))
            ->where('user_id', '!=', $request->user()->id)
            ->whereIn('share_access', ['link', 'password'])
            ->whereNotNull('share_token')
            ->get();

        // Перед resource добавляем runtime-meta, чтобы карточка знала роль и edit/view доступ.
        $projects = $ownedProjects
            ->map(fn (Project $project) => $this->withAccessMeta($request, $project, 'owner'))
            ->merge($sharedProjects->map(fn (Project $project) => $this->withAccessMeta($request, $project, 'collaborator')))
            ->sortByDesc(fn (Project $project) => $project->updated_at)
            ->values();

        return ProjectListResource::collection($projects);
    }

    /**
     * Если frontend не прислал схему, новый проект получает стартовый рабочий пример.
     */
    public function store(StoreProjectRequest $request, DefaultSchemaService $defaultSchema): ProjectResource
    {
        $data = $request->validated();
        $data['dialect'] ??= 'postgresql';

        // Пустой запрос create должен дать пользователю рабочую стартовую схему.
        if (! array_key_exists('schema_code', $data) && ! array_key_exists('schema_json', $data)) {
            $data['schema_code'] = $defaultSchema->schemaCode();
            $data['schema_json'] = $defaultSchema->schemaJson();
        }

        $project = $request->user()->projects()->create($data);

        return ProjectResource::make($project);
    }

    /**
     * Открывать карточку проекта можно владельцу и сохраненному участнику команды.
     */
    public function show(Request $request, Project $project): ProjectResource
    {
        $this->ensureCanViewProject($request, $project);

        return ProjectResource::make($this->withAccessMeta($request, $project->load('user'), $this->accessRole($request, $project)));
    }

    /**
     * Участник с правом edit сохраняет ту же схему, что и владелец.
     */
    public function update(UpdateProjectRequest $request, Project $project): ProjectResource
    {
        $this->ensureCanEditProject($request, $project);

        $project->update($request->validated());

        return ProjectResource::make($this->withAccessMeta($request, $project->refresh()->load('user'), $this->accessRole($request, $project)));
    }

    /**
     * Удаление оставлено только владельцу, чтобы ссылка команды не могла уничтожить проект.
     */
    public function destroy(Request $request, Project $project): JsonResponse
    {
        $this->ensureOwnsProject($request, $project);

        $project->delete();

        return response()->json([
            'message' => 'Project deleted successfully.',
        ]);
    }

    /**
     * Копия начинается приватной и не наследует настройки общего доступа исходника.
     */
    public function duplicate(Request $request, Project $project): ProjectResource
    {
        $this->ensureOwnsProject($request, $project);

        // Контент схемы копируем, а свойства ссылки и личные counters сбрасываем ниже.
        $copy = $project->replicate([
            'last_opened_at',
            'is_favorite',
            'share_token',
            'share_access',
            'share_permission',
            'share_password_hash',
            'shared_at',
        ]);
        $copy->name = "{$project->name} Copy";
        $copy->is_favorite = false;
        $copy->last_opened_at = null;
        // Новая копия не должна открыть доступ всем участникам исходного проекта.
        $copy->share_access = 'private';
        $copy->share_permission = 'view';
        $copy->share_token = null;
        $copy->share_password_hash = null;
        $copy->shared_at = null;
        $copy->user_id = $request->user()->id;
        $copy->save();

        return ProjectResource::make($copy);
    }

    /**
     * Избранное относится к списку владельца, поэтому коллаборатор его не переключает.
     */
    public function favorite(Request $request, Project $project): ProjectResource
    {
        $this->ensureOwnsProject($request, $project);
        $data = $request->validate([
            'is_favorite' => ['sometimes', 'boolean'],
        ]);

        $project->update([
            'is_favorite' => $data['is_favorite'] ?? ! $project->is_favorite,
        ]);

        return ProjectResource::make($project->refresh());
    }

    /**
     * Для владельца обновляем сам проект, для участника сохраняем его личный last_viewed_at.
     */
    public function lastOpened(Request $request, Project $project): ProjectResource
    {
        $this->ensureCanViewProject($request, $project);

        // У collaborator отметка открытия хранится в pivot-like viewer записи, а не в проекте владельца.
        if ($project->user_id !== $request->user()->id) {
            $project->viewers()
                ->where('user_id', $request->user()->id)
                ->update(['last_viewed_at' => now()]);

            return ProjectResource::make($this->withAccessMeta($request, $project->refresh()->load('user'), 'collaborator'));
        }

        $project->update([
            'last_opened_at' => now(),
        ]);

        return ProjectResource::make($project->refresh());
    }

    /**
     * Для чужого проекта отдаем 404 и не подтверждаем, что такой id вообще существует.
     */
    private function ensureOwnsProject(Request $request, Project $project): void
    {
        abort_unless($project->user_id === $request->user()->id, 404);
    }

    /**
     * Участник появляется в viewers после открытия публичной ссылки или ссылки с паролем.
     */
    private function ensureCanViewProject(Request $request, Project $project): void
    {
        if ($project->user_id === $request->user()->id) {
            return;
        }

        abort_unless($this->isRegisteredViewer($request, $project), 404);
    }

    /**
     * Просмотр и редактирование разделены: обычный viewer получает понятный 403 на запись.
     */
    private function ensureCanEditProject(Request $request, Project $project): void
    {
        if ($project->user_id === $request->user()->id) {
            return;
        }

        // Существование viewer недостаточно: для PATCH нужен именно edit.
        abort_unless(
            $this->registeredViewer($request, $project)?->permission === 'edit',
            403
        );
    }

    private function isRegisteredViewer(Request $request, Project $project): bool
    {
        return $this->registeredViewer($request, $project) !== null;
    }

    /**
     * Viewer учитывается только пока проект действительно расшарен.
     */
    private function registeredViewer(Request $request, Project $project): ?ProjectViewer
    {
        if (! $project->isShared()) {
            return null;
        }

        return $project->viewers()
            ->where('user_id', $request->user()->id)
            ->first();
    }

    private function accessRole(Request $request, Project $project): string
    {
        return $project->user_id === $request->user()->id ? 'owner' : 'collaborator';
    }

    /**
     * Resource читает эти runtime-поля и показывает frontend роль и разрешения пользователя.
     */
    private function withAccessMeta(Request $request, Project $project, string $accessRole): Project
    {
        // У владельца право edit не читаем из viewers, потому что он там может вообще отсутствовать.
        $viewerPermission = $accessRole === 'owner'
            ? 'edit'
            : ($this->registeredViewer($request, $project)?->permission ?? 'view');

        // Эти свойства не хранятся в БД, они нужны сериализации ответа для текущего пользователя.
        $project->access_role = $accessRole;
        $project->is_team_project = $accessRole !== 'owner' || ($project->viewers_count ?? 0) > 0;
        $project->viewer_permission = $viewerPermission;
        $project->can_edit = $accessRole === 'owner' || $viewerPermission === 'edit';

        return $project;
    }
}
