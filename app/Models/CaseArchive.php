<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * Permanent historical registry. Never expose CRUD API endpoints for this model.
 * Restrict database account grants in production for stronger retention protection.
 */
class CaseArchive extends Model
{
    protected $guarded = ['id'];
    protected $hidden = [
        'first_snapshot_ciphertext', 'latest_snapshot_ciphertext', 'linked_actions_ciphertext',
    ];
}
