<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('financial_invoices', function (Blueprint $t) {
            $t->id();
            $t->foreignId('survey_case_id')->constrained('survey_cases')->restrictOnDelete();
            $t->string('number', 100)->unique();
            $t->date('issued_at');
            $t->date('due_at')->nullable();
            $t->decimal('amount', 18, 2);
            $t->decimal('paid_amount', 18, 2)->default(0);
            $t->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $t->timestamps();
            $t->index('issued_at');
        });
        Schema::create('financial_expenses', function (Blueprint $t) {
            $t->id();
            $t->foreignId('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $t->string('category', 120);
            $t->enum('type', ['direct', 'fixed']);
            $t->string('description', 500)->nullable();
            $t->decimal('amount', 18, 2);
            $t->date('spent_at');
            $t->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $t->timestamps();
            $t->index('spent_at');
        });
        Schema::create('financial_targets', function (Blueprint $t) {
            $t->id();
            $t->string('period', 7)->unique(); // YYYY-MM, Gregorian reporting period
            $t->decimal('sales_target', 18, 2)->default(0);
            $t->decimal('collection_target', 18, 2)->default(0);
            $t->decimal('expense_target', 18, 2)->default(0);
            $t->foreignId('updated_by')->constrained('users')->restrictOnDelete();
            $t->timestamps();
        });
    }
    public function down(): void
    {
        Schema::dropIfExists('financial_targets');
        Schema::dropIfExists('financial_expenses');
        Schema::dropIfExists('financial_invoices');
    }
};
