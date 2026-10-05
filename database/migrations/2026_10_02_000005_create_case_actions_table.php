<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('case_actions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('survey_cases')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('action_type')->nullable()->index();
            $table->date('action_date')->nullable()->index();
            $table->string('next_action')->nullable();
            $table->date('next_action_at')->nullable();
            $table->foreignId('status_id')->nullable()->constrained('lookup_items')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_actions');
    }
};
