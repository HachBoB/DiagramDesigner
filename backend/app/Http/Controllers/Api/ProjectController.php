<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Project\StoreProjectRequest;
use App\Http\Requests\Project\UpdateProjectRequest;
use App\Http\Resources\ProjectListResource;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Services\DefaultSchemaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ProjectController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $projects = $request->user()
            ->projects()
            ->latest('updated_at')
            ->get();

        return ProjectListResource::collection($projects);
    }

    public function store(StoreProjectRequest $request, DefaultSchemaService $defaultSchema): ProjectResource
    {
        $data = $request->validated();
        $data['dialect'] ??= 'postgresql';

        if (! array_key_exists('schema_code', $data) && ! array_key_exists('schema_json', $data)) {
            $data['schema_code'] = $defaultSchema->schemaCode();
            $data['schema_json'] = $defaultSchema->schemaJson();
        }

        $project = $request->user()->projects()->create($data);

        return ProjectResource::make($project);
    }

    public function show(Request $request, Project $project): ProjectResource
    {
        $this->ensureOwnsProject($request, $project);

        return ProjectResource::make($project);
    }

    public function update(UpdateProjectRequest $request, Project $project): ProjectResource
    {
        $this->ensureOwnsProject($request, $project);

        $project->update($request->validated());

        return ProjectResource::make($project->refresh());
    }

    public function destroy(Request $request, Project $project): JsonResponse
    {
        $this->ensureOwnsProject($request, $project);

        $project->delete();

        return response()->json([
            'message' => 'Project deleted successfully.',
        ]);
    }

    public function duplicate(Request $request, Project $project): ProjectResource
    {
        $this->ensureOwnsProject($request, $project);

        $copy = $project->replicate(['last_opened_at', 'is_favorite']);
        $copy->name = "{$project->name} Copy";
        $copy->is_favorite = false;
        $copy->last_opened_at = null;
        $copy->user_id = $request->user()->id;
        $copy->save();

        return ProjectResource::make($copy);
    }

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

    public function lastOpened(Request $request, Project $project): ProjectResource
    {
        $this->ensureOwnsProject($request, $project);

        $project->update([
            'last_opened_at' => now(),
        ]);

        return ProjectResource::make($project->refresh());
    }

    private function ensureOwnsProject(Request $request, Project $project): void
    {
        abort_unless($project->user_id === $request->user()->id, 404);
    }
}
