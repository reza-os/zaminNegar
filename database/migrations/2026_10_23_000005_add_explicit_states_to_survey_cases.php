<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('survey_cases', function (Blueprint $table) {
            // NULL means not yet classified. Never infer historic states from missing data.
            $table->string('activity_state', 20)->nullable()->index();
            $table->string('registration_state', 20)->nullable()->index();
        });
    }

    public function down(): void
    {
        Schema::table('survey_cases', function (Blueprint $table) {
            $table->dropColumn(['activity_state', 'registration_state']);
        });
    }
};
