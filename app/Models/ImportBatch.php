<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ImportBatch extends Model
{
    use SoftDeletes;
    protected $fillable = [
        'user_id', 'branch_id', 'file_name', 'original_file_name', 'total_rows', 'success_rows', 'failed_rows', 'status', 'started_at', 'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function branch() { return $this->belongsTo(Branch::class); }
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function cases()
    {
        return $this->hasMany(SurveyCase::class, 'import_batch_id');
    }

    public function errors()
    {
        return $this->hasMany(ImportError::class);
    }
}
