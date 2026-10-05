<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LookupItem extends Model
{
    protected $fillable = ['group_key', 'title', 'color', 'sort_order', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }
}
