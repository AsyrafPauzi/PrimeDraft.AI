<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->string('print_profile', 32)->default('dtf')->after('scratch_layout');
            $table->json('preflight_report')->nullable()->after('print_profile');
        });
    }

    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn(['print_profile', 'preflight_report']);
        });
    }
};
