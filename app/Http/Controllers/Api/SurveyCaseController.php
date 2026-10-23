<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\LookupItem;
use App\Models\User;
use App\Models\SurveyCase;
use App\Support\Visibility;
use App\Support\CaseFilters;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SurveyCaseController extends Controller
{
    public function index(Request $request)
    {
        $filters = CaseFilters::validated($request);
        $query = SurveyCase::query()->with([
            'status:id,title,color', 'stage:id,title,color',
            'priority:id,title,color', 'assignedUser:id,name,role',
            'surveyor:id,name,role',
        ]);
        Visibility::cases($query, $request->user());
        return response()->json(CaseFilters::response(CaseFilters::apply($query, $filters), $filters));
    }

    public function filterOptions(Request $request)
    {
        return response()->json(['data' => CaseFilters::options()]);
    }

    public function assignees(Request $request)
    {
        abort_unless($request->user()->isEmployee(), 403);
        return response()->json(['data' => User::query()
            ->where('branch_id', $request->user()->branch_id)
            ->whereIn('role', ['employee', 'surveyor'])
            ->where('is_active', true)->orderBy('name')->get(['id','name'])]);
    }

    public function store(Request $request)
    {
        abort_unless($request->user()->isEmployee(), 403);
        abort_unless($request->user()->branch_id && $request->user()->branch?->is_active, 422, 'برای ثبت پرونده باید به شعبه فعال تخصیص داده شوید.');
        $data = $this->validatedData($request);
        $data['branch_id'] = $request->user()->branch_id;

        $data['created_by'] = $request->user()->id;
        $data['updated_by'] = $request->user()->id;

        $case = SurveyCase::create($data);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'branch_id' => $case->branch_id,
            'action' => 'case_created',
            'description' => 'ثبت پرونده جدید: ' . $case->case_number,
            'subject_type' => SurveyCase::class,
            'subject_id' => $case->id,
            'new_values' => $case->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json($this->loadCase($case), 201);
    }

    public function show(Request $request, SurveyCase $surveyCase)
    {
        $this->authorizeCase($request, $surveyCase);
        return response()->json($this->loadCase($surveyCase));
    }

    public function update(Request $request, SurveyCase $surveyCase)
    {
        abort_unless($request->user()->isEmployee(), 403);
        $this->authorizeCase($request, $surveyCase);
        $oldValues = $surveyCase->toArray();

        $data = $this->validatedData($request, $surveyCase->id);
        $data['updated_by'] = $request->user()->id;

        $surveyCase->update($data);

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'branch_id' => $surveyCase->branch_id,
            'action' => 'case_updated',
            'description' => 'ویرایش پرونده: ' . $surveyCase->case_number,
            'subject_type' => SurveyCase::class,
            'subject_id' => $surveyCase->id,
            'old_values' => $oldValues,
            'new_values' => $surveyCase->fresh()->toArray(),
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json($this->loadCase($surveyCase->fresh()));
    }

    public function destroy(Request $request, SurveyCase $surveyCase)
    {
        abort_unless($request->user()->isEmployee(), 403);
        $this->authorizeCase($request, $surveyCase);
        $surveyCase->delete();
        ActivityLog::create([
            'user_id' => $request->user()->id, 'branch_id' => $surveyCase->branch_id,
            'action' => 'case_deleted', 'description' => 'حذف پرونده: ' . $surveyCase->case_number,
            'subject_type' => SurveyCase::class, 'subject_id' => $surveyCase->id,
            'old_values' => $surveyCase->toArray(), 'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
        return response()->json(['message' => 'پرونده حذف شد؛ سوابق حسابرسی محفوظ است.']);
    }

    private function authorizeCase(Request $request, SurveyCase $case): void
    {
        abort_unless(Visibility::cases(SurveyCase::query()->whereKey($case->id), $request->user())->exists(), 404);
    }

    private function validatedData(Request $request, ?int $caseId = null): array
    {
        $rules = [
            'case_number' => ['required','string','max:100', Rule::unique('survey_cases','case_number')->ignore($caseId)->whereNull('deleted_at')],
            'activity_state' => ['sometimes','nullable',Rule::in(['active','inactive'])],
            'registration_state' => ['sometimes','nullable',Rule::in(['registered','unregistered'])],
            'owner_full_name' => ['required','string','max:255'],
            'case_date_jalali' => ['nullable','string','max:30'],
            'birth_date_jalali' => ['nullable','string','max:30'],
            'last_action_at_jalali' => ['nullable','string','max:30'],
            'next_action_at_jalali' => ['nullable','string','max:30'],
            'father_name' => ['nullable','string','max:255'],
            'national_code' => ['nullable','string','max:20'],
            'village_name' => ['nullable','string','max:255'],
            'surveyor_name_raw' => ['nullable','string','max:255'],
            'phone' => ['nullable','string','max:30'],
            'postal_code' => ['nullable','string','max:30'],
            'file_location' => ['nullable','string','max:255'],
            'description' => ['nullable','string'],
            'status_id' => ['nullable',Rule::exists('lookup_items','id')->where('group_key','case_status')],
            'stage_id' => ['nullable',Rule::exists('lookup_items','id')->where('group_key','case_stage')],
            'priority_id' => ['nullable',Rule::exists('lookup_items','id')->where('group_key','priority')],
            'followup_status_id' => ['nullable',Rule::exists('lookup_items','id')->where('group_key','followup_status')],
            'stop_reason_id' => ['nullable',Rule::exists('lookup_items','id')->where('group_key','stop_reason')],
            'customer_source_id' => ['nullable',Rule::exists('lookup_items','id')->where('group_key','customer_source')],
            'financial_status_id' => ['nullable',Rule::exists('lookup_items','id')->where('group_key','financial_status')],
            'physical_status_id' => ['nullable',Rule::exists('lookup_items','id')->where('group_key','physical_status')],
            'assigned_user_id' => ['nullable', Rule::exists('users','id')->where('branch_id',$request->user()->branch_id)->whereIn('role',['employee','surveyor'])],
            'next_action' => ['nullable','string','max:3000'],
            'contract_amount' => ['nullable','numeric','min:0'],
            'received_amount' => ['nullable','numeric','min:0'],
            'archive_code' => ['nullable','string','max:100'],
        ];
        $data = $request->validate($rules);
        foreach (['case_date_jalali','birth_date_jalali','last_action_at_jalali','next_action_at_jalali'] as $field) {
            if (!empty($data[$field])) {
                $dateText = strtr($data[$field], ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9']);
                abort_unless((bool) preg_match('/^1[34][0-9]{2}\/(0?[1-9]|1[0-2])\/(0?[1-9]|[12][0-9]|3[01])$/', $dateText), 422,
                    'فرمت تاریخ شمسی معتبر نیست: ' . $field);
                $data[$field] = $dateText;
                $gregorianField = [
                    'case_date_jalali'=>'case_date',
                    'birth_date_jalali'=>'birth_date',
                    'last_action_at_jalali'=>'last_action_at',
                    'next_action_at_jalali'=>'next_action_at',
                ][$field];
                try {
                    $data[$gregorianField] = \Morilog\Jalali\Jalalian::fromFormat('Y/m/d',
                        sprintf('%04d/%02d/%02d', ...array_map('intval', explode('/', $dateText))))
                        ->toCarbon()->toDateString();
                } catch (\Throwable $e) {
                    abort(422, 'تاریخ شمسی واردشده معتبر نیست: '.$field);
                }
            } elseif (array_key_exists($field, $data)) {
                $data[[
                    'case_date_jalali'=>'case_date', 'birth_date_jalali'=>'birth_date',
                    'last_action_at_jalali'=>'last_action_at', 'next_action_at_jalali'=>'next_action_at',
                ][$field]] = null;
            }
        }
        // Jalali fields are kept as text and converted to matching Gregorian fields for date queries.
        $data['status_id'] ??= $this->defaultLookupId('case_status', 'جدید');
        $data['stage_id'] ??= $this->defaultLookupId('case_stage', 'ثبت اولیه');
        $data['priority_id'] ??= $this->defaultLookupId('priority', 'عادی');
        $data['contract_amount'] ??= 0;
        $data['received_amount'] ??= 0;
        return $data;
    }

    private function defaultLookupId(string $groupKey, string $title): int
    {
        $item = LookupItem::query()
            ->where('group_key', $groupKey)
            ->where('title', $title)
            ->first();

        if ($item) {
            return $item->id;
        }

        return LookupItem::create([
            'group_key' => $groupKey,
            'title' => $title,
            'color' => '#64748b',
            'sort_order' => ((int) LookupItem::where('group_key', $groupKey)->max('sort_order')) + 1,
            'is_active' => true,
        ])->id;
    }

    private function loadCase(SurveyCase $case): SurveyCase
    {
        return $case->load([
            'status:id,title,color',
            'stage:id,title,color',
            'priority:id,title,color',
            'assignedUser:id,name,role',
            'surveyor:id,name,role',
        ]);
    }
}
