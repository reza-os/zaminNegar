<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CaseDocument extends Model
{
    protected $fillable = ['case_id', 'uploaded_by', 'title', 'file_path', 'file_type', 'file_size', 'description'];

    public function case() { return $this->belongsTo(SurveyCase::class, 'case_id'); }
    public function uploader() { return $this->belongsTo(User::class, 'uploaded_by'); }
}
