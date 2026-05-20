<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ProjectViewer extends Model
{
    protected $fillable = [
        'project_id',
        'user_id',
        'viewer_key',
        'name',
        'email',
        'permission',
        'last_viewed_at',
    ];

    protected function casts(): array
    {
        return [
            'last_viewed_at' => 'datetime',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
