<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rfqs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('project_id')->constrained()->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title')->nullable();
            $table->text('notes')->nullable();
            $table->string('status', 24)->default('open');
            $table->json('quantity_summary')->nullable();
            $table->unsignedBigInteger('awarded_bid_id')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'status']);
            $table->index(['project_id', 'status']);
        });

        Schema::create('rfq_bids', function (Blueprint $table) {
            $table->id();
            $table->foreignId('rfq_id')->constrained()->cascadeOnDelete();
            $table->foreignId('factory_id')->constrained()->cascadeOnDelete();
            $table->decimal('total_price', 12, 2);
            $table->unsignedSmallInteger('lead_time_days')->nullable();
            $table->text('message')->nullable();
            $table->string('status', 24)->default('pending');
            $table->timestamps();

            $table->unique(['rfq_id', 'factory_id']);
            $table->index(['factory_id', 'status']);
        });

        Schema::table('rfqs', function (Blueprint $table) {
            $table->foreign('awarded_bid_id')->references('id')->on('rfq_bids')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('rfqs', function (Blueprint $table) {
            $table->dropForeign(['awarded_bid_id']);
        });
        Schema::dropIfExists('rfq_bids');
        Schema::dropIfExists('rfqs');
    }
};
