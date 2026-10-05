<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('survey_cases', function (Blueprint $table) {
            $table->id();

            $table->string('case_number')->nullable()->unique();
            $table->date('case_date')->nullable()->index();
            $table->string('case_date_jalali')->nullable();

            $table->string('owner_full_name')->index();
            $table->string('father_name')->nullable();
            $table->string('national_code', 20)->nullable()->index();
            $table->date('birth_date')->nullable();
            $table->string('birth_date_jalali')->nullable();

            $table->string('village_name')->nullable()->index();
            $table->string('postal_code', 20)->nullable();
            $table->string('phone', 30)->nullable()->index();

            $table->string('file_location')->nullable();
            $table->text('description')->nullable();

            $table->foreignId('surveyor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('surveyor_name_raw')->nullable();

            $table->foreignId('status_id')->nullable()->constrained('lookup_items')->nullOnDelete();
            $table->foreignId('stage_id')->nullable()->constrained('lookup_items')->nullOnDelete();
            $table->foreignId('assigned_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('priority_id')->nullable()->constrained('lookup_items')->nullOnDelete();

            $table->date('last_action_at')->nullable()->index();
            $table->string('last_action_at_jalali')->nullable();
            $table->string('next_action')->nullable();
            $table->date('next_action_at')->nullable()->index();
            $table->string('next_action_at_jalali')->nullable();

            $table->foreignId('followup_status_id')->nullable()->constrained('lookup_items')->nullOnDelete();
            $table->foreignId('stop_reason_id')->nullable()->constrained('lookup_items')->nullOnDelete();

            $table->decimal('contract_amount', 18, 2)->default(0);
            $table->decimal('received_amount', 18, 2)->default(0);

            $table->foreignId('customer_source_id')->nullable()->constrained('lookup_items')->nullOnDelete();
            $table->foreignId('financial_status_id')->nullable()->constrained('lookup_items')->nullOnDelete();
            $table->foreignId('physical_status_id')->nullable()->constrained('lookup_items')->nullOnDelete();

            $table->string('archive_code')->nullable()->index();

            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('import_batch_id')->nullable()->constrained('import_batches')->nullOnDelete();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('survey_cases');
    }
};
