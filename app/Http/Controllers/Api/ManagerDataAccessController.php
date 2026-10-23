<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\CaseAccessGrant;
use App\Models\ImportBatch;
use App\Models\SurveyCase;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class ManagerDataAccessController extends Controller
{
    public function batches(Request $request)
    {
        $data = $request->validate([
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        $query = ImportBatch::query()->whereNotNull('branch_id')
            ->with(['user:id,name,deleted_at', 'branch:id,name']);
        if (!empty($data['branch_id'])) $query->where('branch_id', $data['branch_id']);
        if (!empty($data['search'])) $query->where('original_file_name', 'like', '%'.trim($data['search']).'%');
        return response()->json($query->latest('id')->paginate(15));
    }

    public function cases(Request $request)
    {
        $data = $request->validate([
            'branch_id' => ['nullable', 'integer', 'exists:branches,id'],
            'search' => ['nullable', 'string', 'max:100'],
            'page' => ['nullable', 'integer', 'min:1'],
        ]);
        // Manual cases only; imported cases are shared through their batch.
        $query = SurveyCase::query()->whereNotNull('branch_id')->whereNull('import_batch_id')
            ->with(['creator:id,name,deleted_at', 'branch:id,name']);
        if (!empty($data['branch_id'])) $query->where('branch_id', $data['branch_id']);
        if (!empty($data['search'])) {
            $search = trim($data['search']);
            $query->where(fn ($q) => $q->where('owner_full_name', 'like', "%{$search}%")
                ->orWhere('case_number', 'like', "%{$search}%"));
        }
        return response()->json($query->latest('id')->paginate(15));
    }

    public function grants(Request $request)
    {
        $data = $request->validate([
            'import_batch_id' => ['required_without:survey_case_id', 'nullable', 'integer'],
            'survey_case_id' => ['required_without:import_batch_id', 'nullable', 'integer'],
        ]);
        abort_if(!empty($data['import_batch_id']) === !empty($data['survey_case_id']), 422, 'یک گروه اکسل یا یک پرونده انتخاب کنید.');
        $scope = !empty($data['import_batch_id']) ? 'import_batch_id' : 'survey_case_id';
        $target = $data[$scope];
        $this->getTarget($scope, (int) $target);
        return response()->json(['data' => CaseAccessGrant::query()->where($scope, $target)
            ->with(['employee:id,name,role,branch_id,deleted_at', 'manager:id,name'])->latest('id')->get()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employee_id' => ['required', 'integer', Rule::exists('users','id')
                ->whereIn('role', ['employee', 'surveyor'])->where('is_active', true)->whereNull('deleted_at')],
            'import_batch_id' => ['required_without:survey_case_id','nullable','integer'],
            'survey_case_id' => ['required_without:import_batch_id','nullable','integer'],
            'can_edit' => ['required','boolean'],
        ]);
        abort_if(!empty($data['import_batch_id']) === !empty($data['survey_case_id']), 422, 'فقط یک منبع را انتخاب کنید.');
        $scope = !empty($data['import_batch_id']) ? 'import_batch_id' : 'survey_case_id';
        $target = $this->getTarget($scope, (int) $data[$scope]);
        abort_unless($target->branch_id, 422, 'ابتدا شعبه داده را مشخص کنید.');

        $employee = User::query()->whereKey($data['employee_id'])->where('is_active', true)
            ->whereIn('role', ['employee','surveyor'])->firstOrFail();
        abort_unless((int) $employee->branch_id === (int) $target->branch_id, 422,
            'کارمند باید عضو همان شعبه باشد.');

        $grant = DB::transaction(function () use ($request, $data, $scope, $target, $employee) {
            $grant = CaseAccessGrant::query()->updateOrCreate([
                'employee_id' => $employee->id,
                $scope => $target->id,
            ], [
                'branch_id' => $target->branch_id,
                'survey_case_id' => $scope === 'survey_case_id' ? $target->id : null,
                'import_batch_id' => $scope === 'import_batch_id' ? $target->id : null,
                'can_edit' => $data['can_edit'],
                'granted_by' => $request->user()->id,
            ]);
            $this->log($request, $grant, 'case_access_granted', 'اعطای دسترسی '.($grant->can_edit?'ویرایش':'مشاهده').' به کارکن شعبه');
            return $grant;
        });
        return response()->json(['data' => $grant->load('employee:id,name,role')], 201);
    }

    public function destroy(Request $request, CaseAccessGrant $grant)
    {
        DB::transaction(function () use ($grant, $request) {
            $this->log($request, $grant, 'case_access_revoked', 'لغو دسترسی پرونده یا گروه اکسل');
            $grant->delete();
        });
        return response()->json(['message' => 'دسترسی لغو شد.']);
    }

    private function getTarget(string $scope, int $id): ImportBatch|SurveyCase
    {
        return $scope === 'import_batch_id'
            ? ImportBatch::query()->whereNotNull('branch_id')->findOrFail($id)
            : SurveyCase::query()->whereNotNull('branch_id')->whereNull('import_batch_id')->findOrFail($id);
    }

    private function log(Request $request, CaseAccessGrant $grant, string $action, string $description): void
    {
        ActivityLog::create([
            'user_id' => $request->user()->id,
            'branch_id' => $grant->branch_id,
            'action' => $action,
            'description' => $description.'؛ کارمند '.$grant->employee_id,
            'subject_type' => CaseAccessGrant::class,
            'subject_id' => $grant->id,
            'new_values' => [
                'employee_id' => $grant->employee_id,
                'import_batch_id' => $grant->import_batch_id,
                'survey_case_id' => $grant->survey_case_id,
                'can_edit' => $grant->can_edit,
            ],
            'ip_address' => $request->ip(), 'user_agent' => $request->userAgent(),
        ]);
    }
}
