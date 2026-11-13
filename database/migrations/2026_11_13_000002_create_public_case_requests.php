<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('public_case_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $table->string('tracking_code', 20)->unique();
            $table->string('full_name', 120);
            // Encrypted with Laravel's APP_KEY at the model layer; do not use a varchar(10).
            $table->text('national_id');
            $table->string('mobile', 11);
            $table->text('description')->nullable();
            $table->string('status', 24)->default('new');
            $table->text('internal_note')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamps();
            $table->index(['branch_id', 'status', 'created_at'], 'public_requests_branch_status_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('public_case_requests');
    }
};
