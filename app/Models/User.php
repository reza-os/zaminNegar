<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes;

    protected $fillable = [
        'name', 'username', 'email', 'mobile', 'password', 'role', 'avatar', 'is_active', 'last_login_at', 'branch_id', 'created_by',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
            'is_active' => 'boolean',
        ];
    }

    public function isAdmin(): bool { return $this->role === 'admin'; }
    public function isManager(): bool { return $this->role === 'manager'; }
    public function isEmployee(): bool { return in_array($this->role, ['employee', 'surveyor'], true); }

    public function branch() { return $this->belongsTo(Branch::class); }
    public function createdUsers() { return $this->hasMany(self::class, 'created_by'); }
    public function createdCases() { return $this->hasMany(SurveyCase::class, 'created_by'); }
    public function importBatches() { return $this->hasMany(ImportBatch::class, 'user_id'); }
    public function activities() { return $this->hasMany(ActivityLog::class, 'user_id'); }
}
