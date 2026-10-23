<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Imports\SurveyCasesImport;
use App\Exports\ImportErrorsExport;
use App\Models\ActivityLog;
use App\Models\ImportBatch;
use App\Models\ImportError;
use App\Models\Branch;
use App\Support\Visibility;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use App\Models\SurveyCase;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class ImportController extends Controller
{
    public function index(Request $request)
    {
        $input = $request->validate([
            'page'=>['nullable','integer','min:1'],
            'search'=>['nullable','string','max:100'],
        ]);
        $query = Visibility::imports(ImportBatch::query()->with('user:id,name,deleted_at'), $request->user());
        if (!empty($input['search'])) {
            $search = trim($input['search']);
            $query->where('original_file_name', 'like', "%{$search}%");
        }
        $history = $query->orderByDesc('id')->paginate(15,
            ['id', 'user_id', 'branch_id', 'original_file_name', 'status',
                'total_rows', 'success_rows', 'failed_rows', 'created_at']);
        return response()->json(['data'=>$history->items(),
            'meta'=>['current_page'=>$history->currentPage(),
                'last_page'=>$history->lastPage(),'total'=>$history->total()]]);
    }

    /**
     * The full file is sent once. We fingerprint it before creating the import,
     * reserve a batch while holding the branch row lock and then process chunks.
     */
    public function store(Request $request)
    {
        abort_unless($request->user()->isEmployee(), 403);
        abort_unless($request->user()->branch_id && $request->user()->branch?->is_active,
            422, 'ابتدا باید به شعبه فعال تخصیص داده شوید.');

        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:51200'],
            'confirm_duplicate' => ['sometimes', 'boolean'],
        ]);

        $file = $request->file('file');
        $fileHash = hash_file('sha256', $file->getRealPath());
        abort_unless($fileHash !== false, 422, 'خواندن فایل ارسالی ممکن نیست.');

        // Save original source on the server; remove that new copy if declined.
        $path = $file->store('imports');
        $user = $request->user();

        try {
            $reserved = DB::transaction(function () use ($request, $user, $file, $fileHash, $path) {
                // Serialize reservations for the same branch to avoid two uploads
                // entering simultaneously without either seeing the other.
                Branch::query()->whereKey($user->branch_id)->lockForUpdate()->firstOrFail();

                $existing = ImportBatch::query()
                    ->where('branch_id', $user->branch_id)
                    ->where('file_hash', $fileHash)
                    ->orderByDesc('id')->first();

                if ($existing && (!$request->boolean('confirm_duplicate') || $existing->status === 'processing')) {
                    return ['duplicate' => $existing];
                }

                return ['batch' => ImportBatch::create([
                    'user_id' => $user->id,
                    'branch_id' => $user->branch_id,
                    'file_name' => $path,
                    'original_file_name' => $file->getClientOriginalName(),
                    'file_hash' => $fileHash,
                    'total_rows' => 0,
                    'success_rows' => 0,
                    'failed_rows' => 0,
                    'status' => 'processing',
                    'started_at' => now(),
                ])];
            });
        } catch (\Throwable $e) {
            Storage::delete($path);
            throw $e;
        }

        if (isset($reserved['duplicate'])) {
            Storage::delete($path);
            $existing = $reserved['duplicate'];
            return response()->json([
                'code' => 'duplicate_file',
                'message' => $existing->status === 'processing'
                    ? 'این فایل هم‌اکنون در همین شعبه در حال پردازش است.'
                    : 'این فایل قبلاً در این شعبه بارگذاری شده است؛ برای ادامه صریحاً تأیید کنید.',
                'existing_batch' => [
                    'id' => $existing->id,
                    'original_file_name' => $existing->original_file_name,
                    'user_id' => $existing->user_id,
                    'success_rows' => $existing->success_rows,
                    'failed_rows' => $existing->failed_rows,
                    'status' => $existing->status,
                ],
                'can_retry_failed' => (int) $existing->user_id === (int) $user->id
                    && (int) $existing->failed_rows > 0
                    && $existing->status !== 'processing',
                'can_confirm_duplicate' => $existing->status !== 'processing',
            ], 409);
        }

        $batch = $reserved['batch'];
        $this->allowLargeImport();

        try {
            Excel::import(new SurveyCasesImport($batch, $user), Storage::path($path));
            $this->finalizeCounters($batch);

            ActivityLog::create([
                'user_id' => $user->id,
                'branch_id' => $batch->branch_id,
                'action' => 'excel_imported',
                'description' => 'بارگذاری فایل اکسل: '.$batch->original_file_name,
                'subject_type' => ImportBatch::class,
                'subject_id' => $batch->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json([
                'message' => (int) $batch->failed_rows > 0
                    ? 'فایل پردازش شد، اما بعضی ردیف‌ها خطا دارند.' : 'تمام ردیف‌های معتبر فایل ثبت شدند.',
                'import_batch' => $batch->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Excel import failed', ['batch_id' => $batch->id, 'message' => $e->getMessage()]);
            $batch->update(['status' => 'failed', 'finished_at' => now()]);
            return response()->json([
                'message' => 'پردازش فایل اکسل ناتمام ماند. پیش از بارگذاری مجدد، وضعیت گروه را بررسی کنید.',
                'import_batch' => $batch->fresh(),
            ], 500);
        }
    }

    /** Retry exactly the original failing row numbers using the original file. */
    public function retryFailed(Request $request, ImportBatch $importBatch)
    {
        $user = $request->user();
        abort_unless($user->isEmployee()
            && (int) $importBatch->user_id === (int) $user->id
            && (int) $importBatch->branch_id === (int) $user->branch_id, 404);

        $retryRows = DB::transaction(function () use ($importBatch) {
            $locked = ImportBatch::query()->whereKey($importBatch->id)->lockForUpdate()->firstOrFail();
            abort_if($locked->status === 'processing', 409, 'این گروه در حال پردازش است.');
            $rows = ImportError::query()->where('import_batch_id', $locked->id)
                ->distinct()->pluck('row_number')->map(fn ($n) => (int) $n)->all();
            abort_if(count($rows) === 0, 422, 'در این گروه ردیف خطاداری برای تلاش مجدد وجود ندارد.');
            abort_unless($locked->file_name && Storage::exists($locked->file_name), 422,
                'فایل اصلی این گروه روی سرور موجود نیست؛ گزارش خطا را دانلود و فایل اصلاح‌شده را بارگذاری کنید.');

            $realHash = hash_file('sha256', Storage::path($locked->file_name));
            abort_unless($realHash !== false, 422, 'فایل اصلی قابل خواندن نیست.');
            if ($locked->file_hash && $locked->file_hash !== $realHash) {
                abort(409, 'فایل اصلی بعد از بارگذاری تغییر کرده و دیگر برای تلاش مجدد معتبر نیست.');
            }
            if (!$locked->file_hash) {
                $locked->file_hash = $realHash;
            }
            $locked->status = 'processing';
            $locked->save();
            return $rows;
        });

        $this->allowLargeImport();
        try {
            $importBatch->refresh();
            Excel::import(new SurveyCasesImport($importBatch, $user, $retryRows),
                Storage::path($importBatch->file_name));
            $this->finalizeCounters($importBatch);
            ActivityLog::create([
                'user_id' => $user->id, 'branch_id' => $importBatch->branch_id,
                'action' => 'excel_import_retried',
                'description' => 'پردازش دوباره فقط ردیف‌های خطادار: '.$importBatch->original_file_name,
                'subject_type' => ImportBatch::class, 'subject_id' => $importBatch->id,
                'ip_address' => $request->ip(), 'user_agent' => $request->userAgent(),
            ]);
            return response()->json([
                'message' => (int) $importBatch->failed_rows === 0
                    ? 'همه ردیف‌های خطادار با موفقیت اصلاح شدند.'
                    : 'تلاش مجدد به پایان رسید؛ گزارش خطاهای باقی‌مانده را بررسی کنید.',
                'import_batch' => $importBatch->fresh(),
            ]);
        } catch (\Throwable $e) {
            Log::error('Excel retry failed', [
                'batch_id' => $importBatch->id, 'message' => $e->getMessage(),
            ]);
            $importBatch->update(['status' => 'failed', 'finished_at' => now()]);
            return response()->json(['message' => 'تلاش مجدد قطع شد. ردیف‌های موفق قبلی پاک نشده‌اند.'], 500);
        }
    }

    /** Authenticated report: no raw national codes or uploaded PII exposed. */
    public function errorReport(Request $request, ImportBatch $importBatch)
    {
        abort_unless(Visibility::imports(ImportBatch::query()->whereKey($importBatch->id),
            $request->user())->exists(), 404);
        return Excel::download(new ImportErrorsExport($importBatch->id),
            'import-errors-'.$importBatch->id.'.xlsx');
    }

    private function finalizeCounters(ImportBatch $batch): void
    {
        $success = SurveyCase::query()->where('import_batch_id', $batch->id)->count();
        $failed = ImportError::query()->where('import_batch_id', $batch->id)
            ->distinct()->count('row_number');
        $batch->update([
            'total_rows' => max((int) $batch->total_rows, $success + $failed),
            'success_rows' => $success,
            'failed_rows' => $failed,
            // `completed` means processing ended; UI distinguishes partial failure.
            'status' => 'completed',
            'finished_at' => now(),
        ]);
        $batch->refresh();
    }

    private function allowLargeImport(): void
    {
        set_time_limit(600);
        ini_set('memory_limit', '1024M');
    }

    public function cases(Request $request, ImportBatch $importBatch)
    {
        abort_unless($request->user()->isEmployee() && Visibility::imports(ImportBatch::query()->whereKey($importBatch->id), $request->user())->exists(), 404);
        $data = $request->validate(['search'=>['nullable','string','max:100'],'page'=>['nullable','integer','min:1']]);
        $search = trim((string)($data['search'] ?? ''));
        $query = Visibility::cases(SurveyCase::query()->where('import_batch_id', $importBatch->id), $request->user())
            ->with('status:id,title,color')->latest('id');
        if ($search !== '') {
            $query->where(fn ($q) => $q->where('case_number','like',"%{$search}%")
                ->orWhere('owner_full_name','like',"%{$search}%")
                ->orWhere('national_code','like',"%{$search}%"));
        }
        $paginator = $query->paginate(20);
        Visibility::annotateCases($paginator->items(), $request->user());
        return response()->json($paginator);
    }

    public function destroy(Request $request, ImportBatch $importBatch)
    {
        abort_unless($request->user()->isEmployee() && (int)$importBatch->user_id === (int)$request->user()->id
            && (int)$importBatch->branch_id === (int)$request->user()->branch_id, 404);
        $deleted = DB::transaction(function () use ($request, $importBatch) {
            $batch = ImportBatch::query()->whereKey($importBatch->id)->lockForUpdate()->firstOrFail();
            abort_if($batch->status === 'processing', 409, 'پردازش فایل هنوز پایان نیافته است.');
            $deleted = SurveyCase::query()->where('import_batch_id', $batch->id)
                ->where('created_by', $request->user()->id)->count();
            SurveyCase::query()->where('import_batch_id', $batch->id)
                ->where('created_by', $request->user()->id)->delete();
            $batch->delete();
            ActivityLog::create([
                'user_id'=>$request->user()->id,'branch_id'=>$batch->branch_id,
                'action'=>'excel_batch_deleted',
                'description'=>'حذف گروه اکسل: '.$batch->original_file_name.' ('.$deleted.' پرونده)',
                'subject_type'=>ImportBatch::class,'subject_id'=>$batch->id,
                'ip_address'=>$request->ip(),'user_agent'=>$request->userAgent(),
            ]);
            return $deleted;
        });
        // Purge the original uploaded spreadsheet from disk after DB soft-deletion.
        // Deleted case records remain soft-deleted for auditing.
        if ($importBatch->file_name && Storage::exists($importBatch->file_name)) {
            if (!Storage::delete($importBatch->file_name)) {
                Log::warning('Import source file could not be deleted', ['batch_id'=>$importBatch->id]);
            }
        }
        return response()->json(['message'=>'گروه اکسل از فهرست حذف شد؛ رکوردهای پرونده نرم‌حذف شدند.','deleted_cases'=>$deleted]);
    }

    public function show(Request $request, ImportBatch $importBatch)
    {
        abort_unless(Visibility::imports(ImportBatch::query()->whereKey($importBatch->id), $request->user())->exists(), 404);
        return $importBatch->load(['errors', 'user']);
    }
}
