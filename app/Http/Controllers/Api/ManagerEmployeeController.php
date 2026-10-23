<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\CaseAccessGrant;
use App\Models\Branch;
use App\Models\ImportBatch;
use App\Models\SurveyCase;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ManagerEmployeeController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'branch_id' => ['sometimes', 'nullable', 'integer', 'exists:branches,id'],
            'search' => ['sometimes', 'nullable', 'string', 'max:100'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:30'],
            'page' => ['sometimes', 'integer', 'min:1'],
        ]);

        $query = User::query()->whereIn('role', ['employee', 'surveyor'])
            ->with('branch:id,name');

        if (!empty($data['branch_id'])) {
            $query->where('branch_id', $data['branch_id']);
        }
        if (isset($data['search']) && trim($data['search']) !== '') {
            $search = trim($data['search']);
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('username', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%")
                    ->orWhere('mobile', 'like', "%{$search}%");
            });
        }

        return response()->json($query->orderByDesc('id')
            ->paginate($data['per_page'] ?? 15, ['id', 'name', 'username', 'email', 'mobile', 'role', 'branch_id', 'is_active', 'created_at']));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'username' => ['required', 'string', 'max:100', Rule::unique('users', 'username')],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'mobile' => ['nullable', 'string', 'max:20'],
            'password' => ['required', 'string', 'min:10', 'max:100'],
            'branch_id' => ['required', 'integer', Rule::exists('branches', 'id')->where('is_active', true)->whereNull('deleted_at')],
        ]);
        $employee = DB::transaction(function () use ($request, $data) {
            // Serialize this assignment with branch deactivation/deletion.
            Branch::whereKey($data['branch_id'])->where('is_active', true)->lockForUpdate()->firstOrFail();
            $employee = User::create([...$data, 'role' => 'employee', 'is_active' => true, 'created_by' => $request->user()->id]);
            $this->log($request, $employee, 'employee_created', 'ایجاد کارمند');
            return $employee;
        });
        return response()->json(['data' => $employee->only(['id', 'name', 'username', 'email', 'role', 'branch_id', 'is_active'])], 201);
    }

    public function update(Request $request, User $employee)
    {
        abort_unless($employee->isEmployee(), 404);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'username' => ['required', 'string', 'max:100', Rule::unique('users', 'username')->ignore($employee->id)],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($employee->id)],
            'mobile' => ['nullable', 'string', 'max:20'],
            'password' => ['nullable', 'string', 'min:10', 'max:100'],
            'branch_id' => ['required', 'integer', Rule::exists('branches', 'id')->where('is_active', true)->whereNull('deleted_at')],
            'is_active' => ['required', 'boolean'],
        ]);

        DB::transaction(function () use ($request, $employee, $data) {
            Branch::whereKey($data['branch_id'])->where('is_active', true)->lockForUpdate()->firstOrFail();
            $old = $employee->only(['name', 'username', 'email', 'mobile', 'branch_id', 'is_active']);
            if (empty($data['password'])) {
                unset($data['password']);
            }
            $employee->update($data);
            // Changing the employee's current branch must not move historical cases or batches.
            CaseAccessGrant::where('employee_id', $employee->id)
                ->where('branch_id', '!=', $employee->branch_id)->delete();
            if (!$employee->is_active) {
                $employee->tokens()->delete();
            }
            $this->log($request, $employee, 'employee_updated', 'ویرایش کارمند', $old,
                $employee->only(['name', 'username', 'email', 'mobile', 'branch_id', 'is_active']));
        });

        return response()->json(['data' => $employee->fresh()->load('branch:id,name')]);
    }

    public function assign(Request $request, User $employee)
    {
        abort_unless($employee->isEmployee(), 404);
        $data = $request->validate(['branch_id' => ['required', 'integer', Rule::exists('branches', 'id')
            ->where('is_active', true)->whereNull('deleted_at')]]);

        DB::transaction(function () use ($employee, $data, $request) {
            Branch::whereKey($data['branch_id'])->where('is_active', true)->lockForUpdate()->firstOrFail();
            $old = $employee->branch_id;
            $employee->update(['branch_id' => $data['branch_id']]);
            // Changing the employee's current branch must not move historical cases or batches.
            CaseAccessGrant::where('employee_id', $employee->id)
                ->where('branch_id', '!=', $employee->branch_id)->delete();
            $this->log($request, $employee, 'employee_assigned', "تغییر شعبه کارمند از {$old} به {$employee->branch_id}",
                ['branch_id' => $old], ['branch_id' => $employee->branch_id]);
        });
        return response()->json(['data' => $employee->fresh()->only(['id', 'name', 'branch_id'])]);
    }

    public function destroy(Request $request, User $employee)
    {
        abort_unless($employee->isEmployee(), 404);
        DB::transaction(function () use ($request, $employee) {
            $old = $employee->only(['name', 'username', 'email', 'branch_id']);
            $employee->update(['is_active' => false]);
            $employee->tokens()->delete();
            CaseAccessGrant::where('employee_id', $employee->id)->delete();
            $employee->delete(); // Soft-delete: never erase case ownership or audit history.
            $this->log($request, $employee, 'employee_deleted', 'حذف نرم حساب کارمند', $old);
        });
        return response()->json(['message' => 'کارمند غیرفعال و از فهرست حذف شد؛ سوابق او محفوظ هستند.']);
    }

    private function backfillUnassignedHistory(User $employee): void
    {
        // Previously attributed cases keep their ORIGINAL branch for historical reporting.
        SurveyCase::where('created_by', $employee->id)->whereNull('branch_id')->update(['branch_id' => $employee->branch_id]);
        ImportBatch::where('user_id', $employee->id)->whereNull('branch_id')->update(['branch_id' => $employee->branch_id]);
    }

    private function log(Request $request, User $employee, string $action, string $description,
                         ?array $old = null, ?array $new = null): void
    {
        ActivityLog::create([
            'user_id' => $request->user()->id, 'branch_id' => $employee->branch_id,
            'action' => $action, 'description' => $description,
            'subject_type' => User::class, 'subject_id' => $employee->id,
            'old_values' => $old, 'new_values' => $new,
            'ip_address' => $request->ip(), 'user_agent' => $request->userAgent(),
        ]);
    }
}
