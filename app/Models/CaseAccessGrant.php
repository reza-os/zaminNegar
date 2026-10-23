<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CaseAccessGrant extends Model
{
    protected $fillable = [
        'employee_id', 'branch_id', 'survey_case_id', 'import_batch_id', 'can_edit', 'granted_by',
    ];

    protected function casts(): array
    {
        return ['can_edit' => 'boolean'];
    }

    public function employee() { return $this->belongsTo(User::class, 'employee_id')->withTrashed(); }
    public function case() { return $this->belongsTo(SurveyCase::class, 'survey_case_id'); }
    public function importBatch() { return $this->belongsTo(ImportBatch::class)->withTrashed(); }
    public function manager() { return $this->belongsTo(User::class, 'granted_by')->withTrashed(); }
}
