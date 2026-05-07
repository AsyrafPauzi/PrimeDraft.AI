<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('factory_size_prices', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('factory_id')->constrained()->cascadeOnDelete();
            $table->string('size_code', 16);
            $table->decimal('price', 10, 2);
            $table->timestamps();
            $table->unique(['factory_id', 'size_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('factory_size_prices');
    }
};
