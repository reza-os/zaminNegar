<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('import_batches', function (Blueprint $table) {
            $table->char('file_hash', 64)->nullable()->after('original_file_name');
            $table->index(['branch_id', 'file_hash'], 'import_batches_branch_hash_index');
        });
    }

    public function down(): void
    {
        Schema::table('import_batches', function (Blueprint $table) {
            $table->dropIndex('import_batches_branch_hash_index');
            $table->dropColumn('file_hash');
        });
    }
};
