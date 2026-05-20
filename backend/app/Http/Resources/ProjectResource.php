<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'dialect' => $this->dialect,
            'schema_code' => $this->schema_code,
            'schema_json' => $this->schema_json,
            'is_favorite' => $this->is_favorite,
            'access_role' => $this->access_role ?? 'owner',
            'viewer_permission' => $this->viewer_permission ?? 'edit',
            'can_edit' => (bool) ($this->can_edit ?? true),
            'is_team_project' => (bool) ($this->is_team_project ?? false),
            'owner' => $this->whenLoaded('user', fn () => [
                'id' => $this->user?->id,
                'name' => $this->user?->name,
                'email' => $this->user?->email,
            ]),
            'share_access' => $this->share_access ?? 'private',
            'share_permission' => $this->share_permission ?? 'view',
            'share_token' => $this->share_token,
            'last_opened_at' => $this->last_opened_at?->toJSON(),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }
}
