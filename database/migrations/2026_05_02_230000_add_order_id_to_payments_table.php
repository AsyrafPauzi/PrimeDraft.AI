<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            $table->foreignId('order_id')->nullable()->after('project_id')->constrained()->nullOnDelete();
            $table->index(['order_id', 'purpose', 'status']);
        });
    }

    public function down(): void
    {
        Schema::table('payments', function (Blueprint $table): void {
            $table->dropIndex(['order_id', 'purpose', 'status']);
            $table->dropConstrainedForeignId('order_id');
        });
    }
};
