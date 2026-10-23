<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        // Permanent record registry. No cascade delete and no ordinary admin CRUD route.
        Schema::create('case_archives', function (Blueprint $table) {
            $table->id();
            $table->char('identity_hash', 64)->unique();
            $table->unsignedBigInteger('branch_id')->nullable()->index();
            $table->string('case_number', 100);
            $table->enum('first_source', ['excel', 'manual', 'legacy']);
            $table->unsignedBigInteger('first_actor_id')->nullable();
            $table->string('first_actor_name')->nullable();
            $table->unsignedBigInteger('first_import_batch_id')->nullable();
            $table->char('first_file_hash', 64)->nullable();
            // Both JSON blobs are encrypted by the application (not stored as plaintext).
            $table->longText('first_snapshot_ciphertext');
            $table->longText('latest_snapshot_ciphertext');
            $table->longText('linked_actions_ciphertext')->nullable();
            $table->unsignedInteger('activation_count')->default(1);
            $table->timestamp('last_seen_at')->nullable();
            $table->timestamps();
            $table->index(['branch_id', 'case_number']);
        });

        // A protected, permanent single copy of each distinct uploaded Excel file per branch.
        Schema::create('archived_import_files', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('branch_id');
            $table->char('file_hash', 64);
            $table->string('original_file_name');
            $table->string('storage_path');
            $table->unsignedBigInteger('first_actor_id')->nullable();
            $table->timestamps();
            $table->unique(['branch_id', 'file_hash']);
        });

        Schema::table('survey_cases', function (Blueprint $table) {
            $table->foreignId('case_archive_id')->nullable()->after('branch_id')
                ->constrained('case_archives')->restrictOnDelete();
        });
    }

    public function down(): void
    {
        // Deliberately no destructive rollback of the permanent archive.
        throw new \RuntimeException('Archive migration is irreversible. Restore from a reviewed backup if necessary.');
    }
};
