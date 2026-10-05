<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportBatch extends Model
{
    protected $fillable = [
        'user_id', 'file_name', 'original_file_name', 'total_rows', 'success_rows', 'failed_rows', 'status', 'started_at', 'finished_at',
    ];

    protected function casts(): array
    {
        return [
            'started_at' => 'datetime',
            'finished_at' => 'datetime',
        ];
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function errors()
    {
        return $this->hasMany(ImportError::class);
    }
}
