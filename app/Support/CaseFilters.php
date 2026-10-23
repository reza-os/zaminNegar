<?php

namespace App\Support;

use App\Models\LookupItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/** Shared, server-side filtering. Always scope the query to the authenticated role first. */
final class CaseFilters
{
    public static function validated(Request $request): array
    {
        return $request->validate([
            'search' => ['sometimes', 'nullable', 'string', 'max:150'],
            'village' => ['sometimes', 'nullable', 'string', 'max:120'],
            'activity_state' => ['sometimes', 'nullable', Rule::in(['active', 'inactive', 'unset'])],
            'registration_state' => ['sometimes', 'nullable', Rule::in(['registered', 'unregistered', 'unset'])],
            'status_id' => ['sometimes', 'nullable', 'integer', Rule::exists('lookup_items', 'id')->where('group_key', 'case_status')],
            'stage_id' => ['sometimes', 'nullable', 'integer', Rule::exists('lookup_items', 'id')->where('group_key', 'case_stage')],
            'followup_status_id' => ['sometimes', 'nullable', 'integer', Rule::exists('lookup_items', 'id')->where('group_key', 'followup_status')],
            'financial_status_id' => ['sometimes', 'nullable', 'integer', Rule::exists('lookup_items', 'id')->where('group_key', 'financial_status')],
            'source' => ['sometimes', 'nullable', Rule::in(['manual', 'excel'])],
            'page' => ['sometimes', 'integer', 'min:1'],
            'per_page' => ['sometimes', 'integer', 'min:5', 'max:100'],
        ]);
    }

    public static function apply(Builder $query, array $filters): Builder
    {
        $search = trim($filters['search'] ?? '');
        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $like = '%' . $search . '%';
                $q->where('case_number', 'like', $like)
                    ->orWhere('owner_full_name', 'like', $like)
                    ->orWhere('father_name', 'like', $like)
                    ->orWhere('national_code', 'like', $like)
                    ->orWhere('phone', 'like', $like)
                    ->orWhere('village_name', 'like', $like)
                    ->orWhere('file_location', 'like', $like)
                    ->orWhere('archive_code', 'like', $like)
                    ->orWhere('description', 'like', $like);
            });
        }

        $village = trim($filters['village'] ?? '');
        if ($village !== '') {
            $query->where('village_name', 'like', '%' . $village . '%');
        }

        foreach (['activity_state', 'registration_state'] as $column) {
            if (($filters[$column] ?? null) === 'unset') {
                $query->whereNull($column);
            } elseif (!empty($filters[$column])) {
                $query->where($column, $filters[$column]);
            }
        }

        foreach (['status_id', 'stage_id', 'followup_status_id', 'financial_status_id'] as $column) {
            if (!empty($filters[$column])) {
                $query->where($column, (int) $filters[$column]);
            }
        }

        if (($filters['source'] ?? null) === 'manual') {
            $query->whereNull('import_batch_id');
        } elseif (($filters['source'] ?? null) === 'excel') {
            $query->whereNotNull('import_batch_id');
        }

        return $query;
    }

    public static function response(Builder $query, array $filters): array
    {
        $perPage = (int) ($filters['per_page'] ?? 25);
        $page = (int) ($filters['page'] ?? 1);
        $paginator = $query->latest('id')->paginate($perPage, ['*'], 'page', $page);

        return [
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'from' => $paginator->firstItem(),
                'to' => $paginator->lastItem(),
                'has_more' => $paginator->hasMorePages(),
            ],
        ];
    }

    public static function options(): array
    {
        return LookupItem::query()
            ->whereIn('group_key', ['case_status', 'case_stage', 'followup_status', 'financial_status'])
            ->orderBy('sort_order')->orderBy('id')
            ->get(['id', 'group_key', 'title'])
            ->groupBy('group_key')
            ->map(fn ($items) => $items->values())
            ->toArray();
    }
}
