<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_viewers', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('viewer_key')->nullable();
            $table->string('name')->nullable();
            $table->string('email')->nullable();
            $table->timestamp('last_viewed_at')->nullable();
            $table->timestamps();

            $table->unique(['project_id', 'user_id']);
            $table->unique(['project_id', 'viewer_key']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_viewers');
    }
};
