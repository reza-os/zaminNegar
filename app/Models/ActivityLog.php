<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ActivityLog extends Model
{
    protected $fillable = ['user_id', 'branch_id', 'action', 'description', 'subject_type', 'subject_id', 'old_values', 'new_values', 'ip_address', 'user_agent'];

    protected function casts(): array
    {
        return ['old_values' => 'array', 'new_values' => 'array'];
    }

    /** Older logs recorded only the file number; resolve a readable name from audit snapshots. */
    public function getDescriptionAttribute(?string $value): ?string
    {
        if ($this->getRawOriginal('action') !== 'case_deleted') return $value;
        $old = $this->old_values;
        $name = is_array($old) ? trim((string)($old['owner_full_name'] ?? '')) : '';
        $number = is_array($old) ? trim((string)($old['case_number'] ?? '')) : '';
        if ($name === '') return $value;
        return 'حذف پرونده «'.$name.'»'.($number !== '' ? ' (شماره '.$number.')' : '');
    }

    public function branch() { return $this->belongsTo(Branch::class); }
    public function user() { return $this->belongsTo(User::class)->withTrashed(); }
}
