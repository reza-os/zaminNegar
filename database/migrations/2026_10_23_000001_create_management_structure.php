<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('manager_id')->constrained('users')->restrictOnDelete();
            $table->string('name');
            $table->string('code')->nullable()->unique();
            $table->string('city')->nullable();
            $table->string('address')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->index(['manager_id', 'is_active']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
        });

        Schema::table('survey_cases', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
        });
        Schema::table('import_batches', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
        });
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
        });

        Schema::create('daily_messages', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['quote', 'poem'])->default('quote');
            $table->text('content');
            $table->string('author')->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_messages');
        Schema::table('activity_logs', fn (Blueprint $table) => $table->dropConstrainedForeignId('branch_id'));
        Schema::table('import_batches', fn (Blueprint $table) => $table->dropConstrainedForeignId('branch_id'));
        Schema::table('survey_cases', fn (Blueprint $table) => $table->dropConstrainedForeignId('branch_id'));
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('branch_id');
            $table->dropConstrainedForeignId('created_by');
        });
        Schema::dropIfExists('branches');
    }
};
