<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DailyMessage extends Model
{
    protected $fillable = ['type', 'content', 'author', 'is_active', 'sort_order'];
    protected function casts(): array { return ['is_active' => 'boolean']; }
}
