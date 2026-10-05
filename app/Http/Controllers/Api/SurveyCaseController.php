<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\LookupItem;
use App\Models\SurveyCase;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SurveyCaseController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 25);
        $perPage = max(5, min($perPage, 100));

        $search = trim((string) $request->query('search', ''));

        $query = SurveyCase::query()
            ->with([
                'status:id,title,color',
                'stage:id,title,color',
                'priority:id,title,color',
                'assignedUser:id,name,role',
                'surveyor:id,name,role',
            ])
            ->latest('id');

        if ($search !== '') {
            $query->where(function ($q) use ($search) {
                $q->where('case_number', 'like', "%{$search}%")
                    ->orWhere('owner_full_name', 'like', "%{$search}%")
                    ->orWhere('father_name', 'like', "%{$search}%")
                    ->orWhere('national_code', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhere('village_name', 'like', "%{$search}%")
                    ->orWhere('file_location', 'like', "%{$search}%")
                    ->orWhere('archive_code', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $paginator = $query->paginate($perPage);

        return response()->json([
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
        ]);
    }

    public function store(Request $request)
    {
        $data = $this->validatedData($request);

        $data['created_by'] = $request->user()->id;
        $data['updated_by'] = $request->user()->id;

        $case = SurveyCase::create($data);

        ActivityLog::create([
            'user_id' => $request->user()->id,
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
        return response()->json($this->loadCase($surveyCase));
    }

    public function update(Request $request, SurveyCase $surveyCase)
    {
        $oldValues = $surveyCase->toArray();

        $data = $this->validatedData($request, $surveyCase->id);
        $data['updated_by'] = $request->user()->id;

        $surveyCase->update($data);

        ActivityLog::create([
            'user_id' => $request->user()->id,
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
        if (! $request->user()->isAdmin()) {
            abort(403, 'فقط مدیر اجازه حذف پرونده را دارد.');
        }

        $caseNumber = $surveyCase->case_number;
        $oldValues = $surveyCase->toArray();

        $surveyCase->delete();

        ActivityLog::create([
            'user_id' => $request->user()->id,
            'action' => 'case_deleted',
            'description' => 'حذف پرونده: ' . $caseNumber,
            'subject_type' => SurveyCase::class,
            'subject_id' => $surveyCase->id,
            'old_values' => $oldValues,
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'message' => 'پرونده با موفقیت حذف شد.',
        ]);
    }

    private function validatedData(Request $request, ?int $caseId = null): array
    {
        $data = $request->validate([
            'case_number' => [
                'required',
                'string',
                'max:100',
                Rule::unique('survey_cases', 'case_number')->ignore($caseId)->whereNull('deleted_at'),
            ],
            'owner_full_name' => ['required', 'string', 'max:255'],
            'father_name' => ['nullable', 'string', 'max:255'],
            'national_code' => ['nullable', 'string', 'max:20'],
            'village_name' => ['nullable', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:30'],
            'postal_code' => ['nullable', 'string', 'max:30'],
            'file_location' => ['nullable', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'status_id' => ['nullable', 'exists:lookup_items,id'],
            'stage_id' => ['nullable', 'exists:lookup_items,id'],
            'priority_id' => ['nullable', 'exists:lookup_items,id'],
            'next_action' => ['nullable', 'string'],
            'contract_amount' => ['nullable', 'numeric', 'min:0'],
            'received_amount' => ['nullable', 'numeric', 'min:0'],
            'archive_code' => ['nullable', 'string', 'max:100'],
        ]);

        $data['status_id'] = $data['status_id'] ?? $this->defaultLookupId('case_status', 'جدید');
        $data['stage_id'] = $data['stage_id'] ?? $this->defaultLookupId('case_stage', 'ثبت اولیه');
        $data['priority_id'] = $data['priority_id'] ?? $this->defaultLookupId('priority', 'عادی');
        $data['contract_amount'] = $data['contract_amount'] ?? 0;
        $data['received_amount'] = $data['received_amount'] ?? 0;

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
