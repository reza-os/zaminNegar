<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\ImportBatch;
use App\Models\SurveyCase;
use App\Models\User;
use App\Support\CaseFilters;
use App\Support\Visibility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ManagerBranchController extends Controller
{
    public function index(Request $request)
    {
        return response()->json(['data' => Branch::query()
            ->withCount(['employees', 'surveyCases', 'importBatches', 'activities'])->orderBy('id')->get()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'code' => ['nullable', 'string', 'max:40', Rule::unique('branches', 'code')],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
        ]);
        $branch = DB::transaction(function () use ($request, $data) {
            // manager_id is a creation audit field, NOT a branch ownership boundary.
            $branch = Branch::create([...$data, 'manager_id' => $request->user()->id]);
            $this->log($request, $branch, 'branch_created', 'ایجاد شعبه');
            return $branch;
        });
        return response()->json(['data' => $branch], 201);
    }

    public function update(Request $request, Branch $branch)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'code' => ['nullable', 'string', 'max:40', Rule::unique('branches', 'code')->ignore($branch->id)],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:255'],
            'is_active' => ['required', 'boolean'],
        ]);

        return DB::transaction(function () use ($request, $branch, $data) {
            $branch = Branch::whereKey($branch->id)->lockForUpdate()->firstOrFail();
            if (!$data['is_active'] && $branch->is_active && $branch->employees()->exists()) {
                return response()->json(['message' => 'ابتدا کارمندان این شعبه را به شعبه دیگری منتقل کنید.'], 409);
            }
            $old = $branch->only(['name', 'code', 'city', 'address', 'is_active']);
            $branch->update($data);
            $this->log($request, $branch, 'branch_updated', 'ویرایش اطلاعات شعبه', $old,
                $branch->only(['name', 'code', 'city', 'address', 'is_active']));
            return response()->json(['data' => $branch->fresh()]);
        });
    }

    public function destroy(Request $request, Branch $branch)
    {
        return DB::transaction(function () use ($request, $branch) {
            $branch = Branch::whereKey($branch->id)->lockForUpdate()->firstOrFail();
            if ($branch->employees()->exists()) {
                return response()->json(['message' => 'این شعبه کارمند دارد؛ ابتدا کارمندان را منتقل یا حذف کنید.'], 409);
            }
            $this->log($request, $branch, 'branch_deleted', 'حذف نرم شعبه؛ سوابق نگهداری شدند',
                $branch->only(['name', 'code', 'city', 'address']));
            $branch->delete(); // Soft-delete; related cases/imports/logs retain branch_id.
            return response()->json(['message' => 'شعبه از فهرست حذف شد؛ سوابق آن محفوظ هستند.']);
        });
    }

    public function show(Request $request, Branch $branch)
    {
        $branch->load(['employees:id,name,username,email,mobile,role,branch_id,is_active,created_at']);
        $branch->loadCount(['employees', 'surveyCases', 'importBatches', 'activities']);
        return response()->json([
            'data' => $branch,
            'totals' => [
                'cases' => $branch->survey_cases_count,
                'imports' => $branch->import_batches_count,
                'imported_rows' => (int) ImportBatch::where('branch_id', $branch->id)->sum('success_rows'),
                'activities' => $branch->activities_count,
            ],
            'employee_summary' => User::withTrashed()->whereIn('role', ['employee', 'surveyor'])
                ->where(function ($query) use ($branch) {
                    $query->where('branch_id', $branch->id)
                        ->orWhereHas('createdCases', fn ($cases) => $cases->where('branch_id', $branch->id))
                        ->orWhereHas('importBatches', fn ($imports) => $imports->where('branch_id', $branch->id))
                        ->orWhereHas('activities', fn ($logs) => $logs->where('branch_id', $branch->id));
                })->withCount([
                    'createdCases' => fn ($q) => $q->where('branch_id', $branch->id),
                    'importBatches' => fn ($q) => $q->where('branch_id', $branch->id),
                    'activities' => fn ($q) => $q->where('branch_id', $branch->id),
                ])->orderBy('name')->get(['id', 'name', 'role', 'branch_id', 'is_active', 'deleted_at']),
            'recent_cases' => SurveyCase::where('branch_id', $branch->id)->latest('id')->limit(12)
                ->get(['id', 'case_number', 'owner_full_name', 'created_by', 'created_at']),
            'recent_activities' => ActivityLog::where('branch_id', $branch->id)->with('user:id,name,role')
                ->latest('id')->limit(25)->get(['id', 'branch_id', 'user_id', 'action', 'description', 'old_values', 'created_at'])->each(fn($log) => $log->makeHidden('old_values')),
        ]);
    }

    /** Paginated cases for a chosen branch; all managers can view all branches. */
    public function cases(Request $request, Branch $branch)
    {
        $filters = CaseFilters::validated($request);
        $query = SurveyCase::query()->where('branch_id', $branch->id)
            ->with(['status:id,title,color', 'stage:id,title,color',
                'priority:id,title,color', 'creator:id,name']);
        Visibility::cases($query, $request->user());

        return response()->json(CaseFilters::response(CaseFilters::apply($query, $filters), $filters));
    }

    private function log(Request $request, Branch $branch, string $action, string $description,
                         ?array $old = null, ?array $new = null): void
    {
        ActivityLog::create([
            'user_id' => $request->user()->id, 'branch_id' => $branch->id,
            'action' => $action, 'description' => $description,
            'subject_type' => Branch::class, 'subject_id' => $branch->id,
            'old_values' => $old, 'new_values' => $new,
            'ip_address' => $request->ip(), 'user_agent' => $request->userAgent(),
        ]);
    }
}
