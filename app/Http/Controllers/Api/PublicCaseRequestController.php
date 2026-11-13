<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use App\Models\Branch;
use App\Models\PublicCaseRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class PublicCaseRequestController extends Controller
{
    /** Public, minimal office directory. No staff or company-internal fields. */
    public function branches()
    {
        return response()->json(['data' => Branch::query()
            ->where('is_active', true)->orderBy('name')->get(['id', 'name', 'city'])]);
    }

    public function store(Request $request)
    {
        $request->merge([
            'full_name' => trim(preg_replace('/\s+/u', ' ', (string) $request->input('full_name', ''))),
            'mobile' => $this->normalizeMobile((string) $request->input('mobile', '')),
            'national_id' => $this->digits((string) $request->input('national_id', '')),
        ]);
        $data = $request->validate([
            'branch_id' => ['required', 'integer', Rule::exists('branches', 'id')
                ->where('is_active', true)->whereNull('deleted_at')],
            'full_name' => ['required', 'string', 'min:3', 'max:120'],
            'mobile' => ['required', 'regex:/^09[0-9]{9}$/D'],
            'national_id' => ['required', 'regex:/^[0-9]{10}$/D', function ($attribute, $value, $fail) {
                if (!$this->validNationalId($value)) $fail('کد ملی معتبر نیست.');
            }],
            'description' => ['nullable', 'string', 'max:1500'],
        ]);

        $record = PublicCaseRequest::create([
            ...$data,
            'tracking_code' => strtoupper(Str::random(14)),
            'status' => 'new',
        ]);
        return response()->json([
            'success' => true,
            'request_id' => $record->tracking_code,
            'message' => 'درخواست به دفتر انتخاب‌شده ارسال شد.',
        ], 201);
    }

    /** Tracking requires both a high-entropy receipt and the original phone number. */
    public function track(Request $request)
    {
        $data = $request->validate([
            'tracking_code' => ['required', 'string', 'size:14'],
            'mobile' => ['required', 'string'],
        ]);
        $record = PublicCaseRequest::query()
            ->where('tracking_code', strtoupper($data['tracking_code']))
            ->where('mobile', $this->normalizeMobile($data['mobile']))
            ->first();
        if (!$record) {
            return response()->json(['message' => 'درخواستی با این شماره پیگیری و تلفن یافت نشد.'], 404);
        }
        return response()->json(['data' => [
            'tracking_code' => $record->tracking_code,
            'status' => $record->status,
            'created_at' => $record->created_at,
        ]]);
    }

    /** Staff can only read their assigned office. Managers can oversee all offices. */
    public function index(Request $request)
    {
        $user = $request->user();
        $this->requireStaffOrManager($user);
        $data = $request->validate([
            'status' => ['nullable', Rule::in(PublicCaseRequest::STATUSES)],
            'branch_id' => ['nullable', 'integer', Rule::exists('branches', 'id')],
            'per_page' => ['nullable', 'integer', 'min:5', 'max:50'],
        ]);
        $query = PublicCaseRequest::query()->with('branch:id,name,city');
        if (!$user->isManager()) {
            abort_unless($user->branch_id, 403, 'کارمند به دفتر تخصیص داده نشده است.');
            $query->where('branch_id', $user->branch_id);
        } elseif (!empty($data['branch_id'])) {
            $query->where('branch_id', $data['branch_id']);
        }
        if (!empty($data['status'])) $query->where('status', $data['status']);
        // Never return national ID or internal notes in a bulk list.
        return response()->json($query->latest('id')->paginate((int)($data['per_page'] ?? 15), [
            'id', 'branch_id', 'tracking_code', 'full_name', 'mobile', 'description',
            'status', 'created_at', 'updated_at',
        ]));
    }

    public function summary(Request $request)
    {
        $user = $request->user();
        $this->requireStaffOrManager($user);
        $query = PublicCaseRequest::query();
        if (!$user->isManager()) {
            abort_unless($user->branch_id, 403);
            $query->where('branch_id', $user->branch_id);
        }
        return response()->json(['new' => (clone $query)->where('status', 'new')->count(),
            'total' => $query->count()]);
    }

    public function show(Request $request, PublicCaseRequest $caseRequest)
    {
        $this->authorizeOffice($request->user(), $caseRequest);
        // Explicit staff-only field rather than serializing the entire model.
        $caseRequest->load('branch:id,name,city');
        return response()->json(['data' => [
            ...$caseRequest->only(['id', 'branch_id', 'tracking_code', 'full_name', 'mobile',
                'description', 'status', 'internal_note', 'reviewed_at', 'created_at']),
            'national_id' => $caseRequest->national_id,
            'branch' => $caseRequest->branch?->only(['id', 'name', 'city']),
        ]]);
    }

    public function update(Request $request, PublicCaseRequest $caseRequest)
    {
        $this->authorizeOffice($request->user(), $caseRequest);
        $data = $request->validate([
            'status' => ['required', Rule::in(PublicCaseRequest::STATUSES)],
            'internal_note' => ['nullable', 'string', 'max:2000'],
        ]);
        $record = DB::transaction(function () use ($request, $caseRequest, $data) {
            $record = PublicCaseRequest::query()->whereKey($caseRequest->id)->lockForUpdate()->firstOrFail();
            $this->authorizeOffice($request->user(), $record);
            $previousStatus = $record->status;
            $record->update([
                'status' => $data['status'],
                'internal_note' => $data['internal_note'] ?? $record->internal_note,
                'reviewed_by' => $request->user()->id,
                'reviewed_at' => now(),
            ]);
            ActivityLog::create([
                'user_id' => $request->user()->id, 'branch_id' => $record->branch_id,
                'action' => 'public_case_request_updated',
                'description' => 'بررسی درخواست اولیه با کد ' . $record->tracking_code,
                'subject_type' => PublicCaseRequest::class, 'subject_id' => $record->id,
                'old_values' => ['status' => $previousStatus],
                'new_values' => ['status' => $record->status],
                'ip_address' => $request->ip(), 'user_agent' => $request->userAgent(),
            ]);
            return $record;
        }, 3);
        return response()->json(['message' => 'وضعیت درخواست ثبت شد.', 'data' => [
            'id' => $record->id, 'status' => $record->status, 'updated_at' => $record->updated_at,
        ]]);
    }

    private function requireStaffOrManager(User $user): void
    {
        abort_unless($user->isManager() || $user->isEmployee(), 403);
    }

    private function authorizeOffice(User $user, PublicCaseRequest $record): void
    {
        $this->requireStaffOrManager($user);
        if (!$user->isManager()) {
            abort_unless($user->branch_id && (int)$user->branch_id === (int)$record->branch_id, 404);
        }
    }

    private function digits(string $value): string
    {
        return strtr(trim($value), [
            '۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
            '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9',
        ]);
    }

    private function normalizeMobile(string $input): string
    {
        $phone = preg_replace('/[\s\-()]+/u', '', $this->digits($input));
        if (str_starts_with($phone, '+98')) return '0'.substr($phone, 3);
        if (str_starts_with($phone, '0098')) return '0'.substr($phone, 4);
        if (str_starts_with($phone, '98') && strlen($phone) === 12) return '0'.substr($phone, 2);
        return $phone;
    }

    private function validNationalId(string $code): bool
    {
        if (!preg_match('/^[0-9]{10}$/D', $code) || preg_match('/^(\d)\1{9}$/D', $code)) return false;
        $sum = 0;
        for ($i = 0; $i < 9; $i++) $sum += (int)$code[$i] * (10 - $i);
        $remain = $sum % 11;
        return (int)$code[9] === ($remain < 2 ? $remain : 11 - $remain);
    }
}
