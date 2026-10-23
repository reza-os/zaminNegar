<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Branch extends Model
{
    use SoftDeletes;

    protected $fillable = ['name', 'code', 'city', 'address', 'manager_id', 'is_active'];
    protected function casts(): array { return ['is_active' => 'boolean']; }
    // Legacy column manager_id indicates the manager who created the branch, not its owner.
    public function creator() { return $this->belongsTo(User::class, 'manager_id'); }
    public function manager() { return $this->creator(); }
    public function employees() { return $this->hasMany(User::class)->whereIn('role', ['employee', 'surveyor']); }
    public function surveyCases() { return $this->hasMany(SurveyCase::class); }
    public function importBatches() { return $this->hasMany(ImportBatch::class); }
    public function activities() { return $this->hasMany(ActivityLog::class); }
}
