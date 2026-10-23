<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('finance_expense_imports', function (Blueprint $t) {
            $t->id();
            $t->char('file_hash', 64)->unique();
            $t->string('original_filename');
            $t->foreignId('created_by')->constrained('users')->restrictOnDelete();
            $t->unsignedInteger('imported_rows')->default(0);
            $t->timestamps();
        });
        Schema::table('financial_expenses', function (Blueprint $t) {
            $t->string('import_key', 191)->nullable()->unique();
            $t->foreignId('finance_expense_import_id')->nullable()->constrained('finance_expense_imports')->nullOnDelete();
        });
        Schema::create('financial_targets_jalali', function (Blueprint $t) {
            $t->id();
            $t->string('period_jalali', 7)->unique();
            $t->decimal('sales_target', 18, 2)->default(0);
            $t->decimal('collection_target', 18, 2)->default(0);
            $t->decimal('expense_target', 18, 2)->default(0);
            $t->foreignId('updated_by')->constrained('users')->restrictOnDelete();
            $t->timestamps();
        });
    }
    public function down(): void {
        Schema::dropIfExists('financial_targets_jalali');
        Schema::table('financial_expenses', function (Blueprint $t) {
            $t->dropForeign(['finance_expense_import_id']);
            $t->dropColumn(['finance_expense_import_id','import_key']);
        });
        Schema::dropIfExists('finance_expense_imports');
    }
};
