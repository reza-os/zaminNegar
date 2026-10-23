<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('case_access_grants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('employee_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            // Exactly one must be set, checked in the application.
            $table->foreignId('survey_case_id')->nullable()->constrained('survey_cases')->restrictOnDelete();
            $table->foreignId('import_batch_id')->nullable()->constrained('import_batches')->restrictOnDelete();
            $table->boolean('can_edit')->default(false);
            $table->foreignId('granted_by')->constrained('users')->restrictOnDelete();
            $table->timestamps();
            $table->unique(['employee_id', 'survey_case_id']);
            $table->unique(['employee_id', 'import_batch_id']);
            $table->index(['branch_id', 'employee_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_access_grants');
    }
};
