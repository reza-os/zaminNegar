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
                foreach (self::textVariants($search) as $variant) {
                    foreach (['case_number', 'owner_full_name', 'father_name', 'national_code',
                        'phone', 'village_name', 'file_location', 'archive_code', 'description'] as $field) {
                        $q->orWhere($field, 'like', '%' . $variant . '%');
                    }
                }
            });
        }

        $village = trim($filters['village'] ?? '');
        if ($village !== '') {
            $query->where(function ($q) use ($village) {
                foreach (self::textVariants($village) as $variant) {
                    $q->orWhere('village_name', 'like', '%' . $variant . '%');
                }
            });
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

    /** Supports legacy Persian/Arabic digits and Persian/Arabic letter forms without rewriting user data. */
    public static function textVariants(string $value): array
    {
        $original = trim(preg_replace('/\s+/u', ' ', $value));
        $latin = strtr($original, [
            '۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
            '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9',
            'ي'=>'ی','ك'=>'ک',
        ]);
        $persian = strtr($latin, ['0'=>'۰','1'=>'۱','2'=>'۲','3'=>'۳','4'=>'۴','5'=>'۵','6'=>'۶','7'=>'۷','8'=>'۸','9'=>'۹']);
        $arabic = strtr($latin, ['0'=>'٠','1'=>'١','2'=>'٢','3'=>'٣','4'=>'٤','5'=>'٥','6'=>'٦','7'=>'٧','8'=>'٨','9'=>'٩','ی'=>'ي','ک'=>'ك']);
        return array_values(array_unique(array_filter([$original, $latin, $persian, $arabic], fn ($v) => $v !== '')));
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
