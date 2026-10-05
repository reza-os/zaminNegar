<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ImportError extends Model
{
    protected $fillable = ['import_batch_id', 'row_number', 'field_name', 'error_message', 'row_data'];

    protected function casts(): array
    {
        return ['row_data' => 'array'];
    }

    public function batch() { return $this->belongsTo(ImportBatch::class, 'import_batch_id'); }
}
