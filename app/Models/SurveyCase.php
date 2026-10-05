<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class SurveyCase extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'case_number', 'case_date', 'case_date_jalali',
        'owner_full_name', 'father_name', 'national_code', 'birth_date', 'birth_date_jalali',
        'village_name', 'postal_code', 'phone', 'file_location', 'description',
        'surveyor_id', 'surveyor_name_raw', 'status_id', 'stage_id', 'assigned_user_id', 'priority_id',
        'last_action_at', 'last_action_at_jalali', 'next_action', 'next_action_at', 'next_action_at_jalali',
        'followup_status_id', 'stop_reason_id', 'contract_amount', 'received_amount',
        'customer_source_id', 'financial_status_id', 'physical_status_id', 'archive_code',
        'created_by', 'updated_by', 'import_batch_id',
    ];

    protected $appends = ['remaining_amount', 'days_without_action'];

    protected function casts(): array
    {
        return [
            'case_date' => 'date',
            'birth_date' => 'date',
            'last_action_at' => 'date',
            'next_action_at' => 'date',
            'contract_amount' => 'decimal:2',
            'received_amount' => 'decimal:2',
        ];
    }

    public function getRemainingAmountAttribute(): string
    {
        return number_format((float) $this->contract_amount - (float) $this->received_amount, 2, '.', '');
    }

    public function getDaysWithoutActionAttribute(): ?int
    {
        return $this->last_action_at ? $this->last_action_at->diffInDays(now()) : null;
    }

    public function status() { return $this->belongsTo(LookupItem::class, 'status_id'); }
    public function stage() { return $this->belongsTo(LookupItem::class, 'stage_id'); }
    public function priority() { return $this->belongsTo(LookupItem::class, 'priority_id'); }
    public function followupStatus() { return $this->belongsTo(LookupItem::class, 'followup_status_id'); }
    public function stopReason() { return $this->belongsTo(LookupItem::class, 'stop_reason_id'); }
    public function customerSource() { return $this->belongsTo(LookupItem::class, 'customer_source_id'); }
    public function financialStatus() { return $this->belongsTo(LookupItem::class, 'financial_status_id'); }
    public function physicalStatus() { return $this->belongsTo(LookupItem::class, 'physical_status_id'); }

    public function surveyor() { return $this->belongsTo(User::class, 'surveyor_id'); }
    public function assignedUser() { return $this->belongsTo(User::class, 'assigned_user_id'); }
    public function creator() { return $this->belongsTo(User::class, 'created_by'); }
    public function updater() { return $this->belongsTo(User::class, 'updated_by'); }
    public function actions() { return $this->hasMany(CaseAction::class, 'case_id'); }
    public function documents() { return $this->hasMany(CaseDocument::class, 'case_id'); }
}
