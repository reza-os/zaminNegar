<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PublicCaseRequest extends Model
{
    public const STATUSES = ['new', 'in_review', 'contacted', 'accepted', 'rejected'];

    protected $fillable = [
        'branch_id', 'tracking_code', 'full_name', 'national_id', 'mobile',
        'description', 'status', 'internal_note', 'reviewed_by', 'reviewed_at',
    ];

    protected $hidden = ['national_id', 'internal_note'];

    protected function casts(): array
    {
        return ['national_id' => 'encrypted', 'reviewed_at' => 'datetime'];
    }

    public function branch() { return $this->belongsTo(Branch::class); }
    public function reviewer() { return $this->belongsTo(User::class, 'reviewed_by'); }
}
