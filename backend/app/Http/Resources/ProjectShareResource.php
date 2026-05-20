<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectShareResource extends JsonResource
{
    public static $wrap = null;

    public function toArray(Request $request): array
    {
        return [
            'project_id' => $this->id,
            'access' => $this->share_access ?? 'private',
            'permission' => $this->share_permission ?? 'view',
            'share_token' => $this->share_token,
            'password_required' => $this->share_access === 'password',
            'shared_at' => $this->shared_at?->toJSON(),
            'owner' => [
                'id' => $this->user?->id,
                'name' => $this->user?->name,
                'email' => $this->user?->email,
            ],
            'viewers' => $this->whenLoaded('viewers', fn () => $this->viewers
                ->sortByDesc('last_viewed_at')
                ->values()
                ->map(fn ($viewer): array => [
                    'id' => $viewer->id,
                    'user_id' => $viewer->user_id,
                    'name' => $viewer->name ?: 'Гость',
                    'email' => $viewer->email,
                    'permission' => $viewer->permission ?? 'view',
                    'is_guest' => $viewer->user_id === null,
                    'last_viewed_at' => $viewer->last_viewed_at?->toJSON(),
                ])
                ->all()),
        ];
    }
}
