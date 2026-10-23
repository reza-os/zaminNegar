<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\CaseAction;
use App\Models\ImportBatch;
use App\Models\LookupItem;
use App\Models\SurveyCase;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * Read-only dashboard for all managers. Every manager sees all branches.
 * Visibility is enforced in the SQL query and not delegated to React.
 */
class ManagerAnalyticsController extends Controller
{
    private const DIMENSIONS = [
        'case_status' => ['field' => 'status_id', 'label' => 'وضعیت پرونده'],
        'case_stage' => ['field' => 'stage_id', 'label' => 'مرحله پرونده'],
        'financial_status' => ['field' => 'financial_status_id', 'label' => 'وضعیت مالی'],
        'followup_status' => ['field' => 'followup_status_id', 'label' => 'وضعیت پیگیری'],
        'physical_status' => ['field' => 'physical_status_id', 'label' => 'وضعیت فیزیکی'],
    ];

    public function options(Request $request)
    {
        $validated = $request->validate([
            'type' => ['required', Rule::in(['employee', 'branch'])],
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'page' => ['sometimes', 'integer', 'min:1', 'max:10000'],
        ]);
        $page = (int) ($validated['page'] ?? 1);
        $search = trim((string) ($validated['search'] ?? ''));
        // Escape SQL LIKE wildcards so searches are literal.
        $term = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $search);

        if ($validated['type'] === 'branch') {
            $query = Branch::query();
            if ($search !== '') {
                $query->where(function (Builder $q) use ($term) {
                    $q->where('name', 'like', "%{$term}%")
                        ->orWhere('city', 'like', "%{$term}%")
                        ->orWhere('code', 'like', "%{$term}%");
                });
            }
            $result = $query->orderBy('name')->paginate(15, ['id', 'name', 'code', 'city', 'is_active'], 'page', $page);
        } else {
            $query = User::query()->whereIn('role', ['employee', 'surveyor'])->with('branch:id,name');
            if ($search !== '') {
                $query->where(function (Builder $q) use ($term) {
                    $q->where('name', 'like', "%{$term}%")
                        ->orWhere('username', 'like', "%{$term}%")
                        ->orWhere('email', 'like', "%{$term}%")
                        ->orWhere('mobile', 'like', "%{$term}%");
                });
            }
            $result = $query->orderBy('name')->paginate(15,
                ['id', 'name', 'username', 'branch_id', 'is_active'], 'page', $page);
        }

        return response()->json([
            'data' => $result->items(),
            'current_page' => $result->currentPage(),
            'last_page' => $result->lastPage(),
            'total' => $result->total(),
        ]);
    }

    public function overview(Request $request)
    {
        $validated = $request->validate([
            'scope' => ['sometimes', Rule::in(['all', 'employee', 'branch'])],
            'id' => ['required_if:scope,employee,branch', 'nullable', 'integer', 'min:1'],
        ]);
        $scope = $validated['scope'] ?? 'all';
        $subject = null;
        $subjectId = (int) ($validated['id'] ?? 0);

        if ($scope === 'employee') {
            $employee = User::query()->whereIn('role', ['employee', 'surveyor'])->findOrFail($subjectId);
            $employee->load('branch:id,name');
            $subject = $employee->only(['id', 'name', 'username', 'email', 'mobile', 'role', 'is_active',
                'branch_id', 'created_at', 'last_login_at']);
            $subject['branch_name'] = $employee->branch?->name;
        } elseif ($scope === 'branch') {
            $branch = Branch::query()->findOrFail($subjectId);
            $subject = $branch->only(['id', 'name', 'code', 'city', 'address', 'is_active', 'created_at']);
        }

        // Branch-less historical records intentionally stay outside shared manager reports,
        // matching the project's established manager visibility policy.
        $cases = SurveyCase::query()->whereNotNull('branch_id');
        $imports = ImportBatch::query()->whereNotNull('branch_id');
        $activities = ActivityLog::query()->whereNotNull('branch_id');
        $employees = User::query()->whereIn('role', ['employee', 'surveyor']);

        if ($scope === 'employee') {
            $cases->where('created_by', $subjectId);
            $imports->where('user_id', $subjectId);
            $activities->where('user_id', $subjectId);
            $employees->whereKey($subjectId);
        } elseif ($scope === 'branch') {
            $cases->where('branch_id', $subjectId);
            $imports->where('branch_id', $subjectId);
            $activities->where('branch_id', $subjectId);
            $employees->where('branch_id', $subjectId);
        }

        $now = CarbonImmutable::now();
        $weekStart = $now->startOfDay()->subDays(6);
        $total = (clone $cases)->count();
        $newToday = (clone $cases)->whereDate('created_at', $now->toDateString())->count();
        $newMonth = (clone $cases)->where('created_at', '>=', $now->startOfMonth())->count();
        $due = (clone $cases)->whereNotNull('next_action_at')
            ->whereDate('next_action_at', '<=', $now->toDateString())->count();
        $statusAssigned = (clone $cases)->whereNotNull('status_id')->count();
        $actionRecorded = (clone $cases)->whereNotNull('last_action_at')->count();
        $contract = (float) (clone $cases)->sum('contract_amount');
        $received = (float) (clone $cases)->sum('received_amount');

        // Group in SQL rather than transferring every case to PHP.
        $weeklyCounts = (clone $cases)
            ->where('created_at', '>=', $weekStart)
            ->selectRaw('DATE(created_at) as day, COUNT(*) as amount')
            ->groupBy(DB::raw('DATE(created_at)'))
            ->pluck('amount', 'day');
        $weekly = [];
        for ($i = 0; $i < 7; $i++) {
            $date = $weekStart->addDays($i);
            $weekly[] = ['date' => $date->toDateString(), 'count' => (int) ($weeklyCounts[$date->toDateString()] ?? 0)];
        }

        $lookups = LookupItem::query()->whereIn('group_key', array_keys(self::DIMENSIONS))
            ->orderBy('sort_order')->get(['id', 'group_key', 'title', 'color'])->groupBy('group_key');
        $groups = [];
        foreach (self::DIMENSIONS as $groupKey => $definition) {
            $field = $definition['field']; // Hardcoded allow-list, never user input.
            $counts = (clone $cases)->select($field)->selectRaw('COUNT(*) as aggregate')
                ->groupBy($field)->get()->mapWithKeys(fn ($row) => [
                    $row->{$field} === null ? '_null' : (string) $row->{$field} => (int) $row->aggregate,
                ])->all();
            $items = [];
            foreach (($lookups[$groupKey] ?? collect()) as $lookup) {
                $count = (int) ($counts[(string) $lookup->id] ?? 0);
                $items[] = ['id' => $lookup->id, 'label' => $lookup->title,
                    'color' => $lookup->color, 'count' => $count];
                unset($counts[(string) $lookup->id]);
            }
            foreach ($counts as $key => $count) {
                $items[] = ['id' => $key, 'label' => $key === '_null' ? 'ثبت‌نشده' : 'وضعیت نامشخص',
                    'color' => null, 'count' => (int) $count];
            }
            $groups[] = ['key' => $groupKey, 'label' => $definition['label'],
                'items' => $items, 'total' => $total];
        }

        $scopeCases = clone $cases;
        $actionCount = $scope === 'employee'
            ? CaseAction::query()->where('user_id', $subjectId)->whereIn('case_id', $scopeCases->select('id'))->count()
            : CaseAction::query()->whereIn('case_id', $scopeCases->select('id'))->count();
        $summary = [
            'total_cases' => $total,
            'created_today' => $newToday,
            'created_month' => $newMonth,
            'due_followups' => $due,
            'import_batches' => (clone $imports)->count(),
            'imported_rows' => (int) (clone $imports)->sum('success_rows'),
            'activities' => (clone $activities)->count(),
            'case_actions' => $actionCount,
            'employees' => (clone $employees)->count(),
            'branches' => $scope === 'all' ? Branch::count() : ($scope === 'branch' ? 1 : (isset($employee) && $employee->branch_id ? 1 : 0)),
        ];

        $percent = static fn (float $part, float $whole): int => $whole > 0
            ? (int) max(0, min(100, round($part * 100 / $whole))) : 0;
        $radar = [
            ['label' => 'دارای وضعیت', 'value' => $percent($statusAssigned, $total)],
            ['label' => 'دارای اقدام', 'value' => $percent($actionRecorded, $total)],
            ['label' => 'ثبت ماه', 'value' => $percent($newMonth, $total)],
            ['label' => 'سررسید پیگیری', 'value' => $percent($due, $total)],
            ['label' => 'دریافتی قرارداد', 'value' => $percent($received, $contract)],
        ];

        return response()->json([
            'scope' => $scope, 'subject' => $subject, 'summary' => $summary,
            'weekly' => $weekly, 'radar' => $radar, 'status_groups' => $groups,
            'recent_cases' => (clone $cases)->with('status:id,title')->latest('id')->limit(6)
                ->get(['id', 'case_number', 'owner_full_name', 'status_id', 'created_at']),
            'recent_activities' => (clone $activities)->with('user:id,name')->latest('id')->limit(8)
                ->get(['id', 'user_id', 'action', 'description', 'created_at']),
        ]);
    }
}
