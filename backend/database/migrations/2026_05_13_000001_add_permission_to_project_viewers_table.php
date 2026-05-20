<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_viewers', function (Blueprint $table): void {
            $table->string('permission', 20)->default('view')->after('email');
        });

        DB::table('project_viewers')
            ->orderBy('id')
            ->chunkById(100, function ($viewers): void {
                foreach ($viewers as $viewer) {
                    $permission = DB::table('projects')
                        ->where('id', $viewer->project_id)
                        ->value('share_permission');

                    DB::table('project_viewers')
                        ->where('id', $viewer->id)
                        ->update([
                            'permission' => in_array($permission, ['view', 'edit'], true) ? $permission : 'view',
                        ]);
                }
            });
    }

    public function down(): void
    {
        Schema::table('project_viewers', function (Blueprint $table): void {
            $table->dropColumn('permission');
        });
    }
};
