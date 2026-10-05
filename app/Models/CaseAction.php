<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CaseAction extends Model
{
    protected $fillable = ['case_id', 'user_id', 'title', 'description', 'action_type', 'action_date', 'next_action', 'next_action_at', 'status_id'];

    protected function casts(): array
    {
        return ['action_date' => 'date', 'next_action_at' => 'date'];
    }

    public function case() { return $this->belongsTo(SurveyCase::class, 'case_id'); }
    public function user() { return $this->belongsTo(User::class); }
    public function status() { return $this->belongsTo(LookupItem::class, 'status_id'); }
}
