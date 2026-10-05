<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('lookup_items', function (Blueprint $table) {
            $table->id();
            $table->string('group_key')->index();
            $table->string('title');
            $table->string('color')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true)->index();
            $table->timestamps();

            $table->unique(['group_key', 'title']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lookup_items');
    }
};
