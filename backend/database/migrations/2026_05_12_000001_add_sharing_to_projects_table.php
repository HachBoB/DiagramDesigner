<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->string('share_token')->nullable()->unique()->after('last_opened_at');
            $table->string('share_access')->default('private')->after('share_token');
            $table->string('share_password_hash')->nullable()->after('share_access');
            $table->timestamp('shared_at')->nullable()->after('share_password_hash');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table): void {
            $table->dropUnique(['share_token']);
            $table->dropColumn([
                'share_token',
                'share_access',
                'share_password_hash',
                'shared_at',
            ]);
        });
    }
};
