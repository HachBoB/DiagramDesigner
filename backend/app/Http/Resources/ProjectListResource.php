<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProjectListResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'dialect' => $this->dialect,
            'tables_count' => $this->countSchemaItems('nodes'),
            'relations_count' => $this->countSchemaItems('edges'),
            'is_favorite' => $this->is_favorite,
            'last_opened_at' => $this->last_opened_at?->toJSON(),
            'created_at' => $this->created_at?->toJSON(),
            'updated_at' => $this->updated_at?->toJSON(),
        ];
    }

    private function countSchemaItems(string $key): int
    {
        $items = $this->schema_json[$key] ?? [];

        return is_array($items) ? count($items) : 0;
    }
}
