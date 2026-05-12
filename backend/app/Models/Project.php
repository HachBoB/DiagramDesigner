<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'description',
        'dialect',
        'schema_code',
        'schema_json',
        'is_favorite',
        'last_opened_at',
        'share_token',
        'share_access',
        'share_permission',
        'share_password_hash',
        'shared_at',
    ];

    protected function casts(): array
    {
        return [
            'schema_json' => 'array',
            'is_favorite' => 'boolean',
            'last_opened_at' => 'datetime',
            'shared_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function viewers(): HasMany
    {
        return $this->hasMany(ProjectViewer::class);
    }

    public function isShared(): bool
    {
        return in_array($this->share_access, ['link', 'password'], true)
            && filled($this->share_token);
    }
}
