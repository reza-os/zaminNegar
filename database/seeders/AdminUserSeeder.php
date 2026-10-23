<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class AdminUserSeeder extends Seeder
{
    public function run(): void
    {
        // Never overwrite existing administrator credentials when seeding daily messages.
        if (User::where('role', 'admin')->exists()) {
            return;
        }

        $password = env('ADMIN_BOOTSTRAP_PASSWORD');
        if (!is_string($password) || strlen($password) < 12) {
            $this->command?->warn('Admin not created: set ADMIN_BOOTSTRAP_PASSWORD (12+ chars) in environment.');
            return;
        }

        User::create([
            'name' => 'ادمین اصلی',
            'username' => 'admin',
            'email' => env('ADMIN_BOOTSTRAP_EMAIL', 'admin@zaminnegar.local'),
            'password' => $password,
            'role' => 'admin',
            'is_active' => true,
        ]);
    }
}
