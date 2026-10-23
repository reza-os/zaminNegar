<?php

namespace App\Support;

use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/** All row-level read permissions are enforced in Laravel, not in React. */
final class Visibility
{
    public static function cases(Builder $query, User $user): Builder
    {
        // Every manager can read cases of every branch (even if another manager created it).
        // Historical cases without a branch are not shared with managers automatically.
        if ($user->isManager()) {
            return $query->whereNotNull('branch_id');
        }

        // An employee sees ONLY cases they themselves registered, regardless of their branch.
        return $query->where('created_by', $user->id);
    }

    public static function imports(Builder $query, User $user): Builder
    {
        if ($user->isManager()) {
            return $query->whereNotNull('branch_id');
        }

        return $query->where('user_id', $user->id);
    }

    public static function activities(Builder $query, User $user): Builder
    {
        if ($user->isManager()) {
            // Management logs tied to any branch are shared; branch-less admin logs are not.
            return $query->whereNotNull('branch_id');
        }

        return $query->where('user_id', $user->id);
    }
}
