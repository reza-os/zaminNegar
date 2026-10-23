<?php

namespace App\Support;

use App\Models\CaseAccessGrant;
use App\Models\SurveyCase;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;

/** Row-level permissions. A branch owns the data; created_by always records authorship. */
final class Visibility
{
    public static function cases(Builder $query, User $user): Builder
    {
        if ($user->isManager()) {
            return $query->whereNotNull('branch_id');
        }
        if (!$user->isEmployee() || !$user->branch_id) {
            return $query->whereRaw('1 = 0');
        }

        return $query->where('branch_id', $user->branch_id)
            ->where(function (Builder $q) use ($user) {
                $q->where('created_by', $user->id)
                    ->orWhereIn('id', CaseAccessGrant::query()->select('survey_case_id')
                        ->where('employee_id', $user->id)
                        ->where('branch_id', $user->branch_id)
                        ->whereNotNull('survey_case_id'))
                    ->orWhereIn('import_batch_id', CaseAccessGrant::query()->select('import_batch_id')
                        ->where('employee_id', $user->id)
                        ->where('branch_id', $user->branch_id)
                        ->whereNotNull('import_batch_id'));
            });
    }

    public static function canEditCase(User $user, \App\Models\SurveyCase $case): bool
    {
        if (!$user->isEmployee() || !$user->branch_id || (int) $case->branch_id !== (int) $user->branch_id) {
            return false;
        }
        if ((int) $case->created_by === (int) $user->id) {
            return true;
        }
        return CaseAccessGrant::query()->where('employee_id', $user->id)
            ->where('branch_id', $user->branch_id)->where('can_edit', true)
            ->where(function ($q) use ($case) {
                $q->where('survey_case_id', $case->id);
                if ($case->import_batch_id) {
                    $q->orWhere('import_batch_id', $case->import_batch_id);
                }
            })->exists();
    }

    /** Annotate paginated employee cases without a query per case. */
    public static function annotateCases(iterable $cases, User $user): void
    {
        if (!$user->isEmployee()) return;
        $items = collect($cases);
        $caseIds = $items->pluck('id')->filter()->all();
        $batchIds = $items->pluck('import_batch_id')->filter()->unique()->all();
        $grants = CaseAccessGrant::query()->where('employee_id', $user->id)
            ->where('branch_id', $user->branch_id)->where('can_edit', true)
            ->where(function ($q) use ($caseIds, $batchIds) {
                $q->whereIn('survey_case_id', $caseIds)->orWhereIn('import_batch_id', $batchIds);
            })->get(['survey_case_id','import_batch_id']);
        $editableCases = $grants->pluck('survey_case_id')->filter()->map(fn($id)=>(int)$id)->all();
        $editableBatches = $grants->pluck('import_batch_id')->filter()->map(fn($id)=>(int)$id)->all();
        foreach ($items as $case) {
            $isOwner = (int) $case->created_by === (int) $user->id
                && (int) $case->branch_id === (int) $user->branch_id;
            $canEdit = $isOwner || (in_array((int)$case->id, $editableCases, true)
                || ($case->import_batch_id && in_array((int)$case->import_batch_id, $editableBatches, true)));
            $case->setAttribute('can_edit', $canEdit);
            $case->setAttribute('can_delete', $isOwner);
        }
    }

    public static function imports(Builder $query, User $user): Builder
    {
        if ($user->isManager()) {
            return $query->whereNotNull('branch_id');
        }
        if (!$user->isEmployee() || !$user->branch_id) {
            return $query->whereRaw('1 = 0');
        }
        return $query->where('branch_id', $user->branch_id)
            ->where(function (Builder $q) use ($user) {
                $q->where('user_id', $user->id)
                    ->orWhereIn('id', CaseAccessGrant::query()->select('import_batch_id')
                        ->where('employee_id', $user->id)
                        ->where('branch_id', $user->branch_id)
                        ->whereNotNull('import_batch_id'));
            });
    }

    public static function activities(Builder $query, User $user): Builder
    {
        if ($user->isManager()) {
            return $query->whereNotNull('branch_id');
        }
        return $query->where('user_id', $user->id);
    }
}
