<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::create('excel_revision_previews', function(Blueprint $t) {
            $t->id();
            $t->char('token',64)->unique();
            $t->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $t->foreignId('branch_id')->constrained('branches')->restrictOnDelete();
            $t->char('file_hash',64);
            $t->string('original_name');
            $t->string('storage_path');
            $t->longText('manifest_ciphertext');
            $t->timestamp('expires_at');
            $t->timestamp('applied_at')->nullable();
            $t->timestamps();
        });
    }
    public function down(): void { Schema::dropIfExists('excel_revision_previews'); }
};
