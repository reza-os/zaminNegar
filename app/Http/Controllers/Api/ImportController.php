<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Imports\SurveyCasesImport;
use App\Models\ActivityLog;
use App\Models\ImportBatch;
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

    public function store(Request $request)
    {
        abort_unless($request->user()->isEmployee(), 403);
        abort_unless($request->user()->branch_id && $request->user()->branch?->is_active, 422, 'ابتدا باید به شعبه فعال تخصیص داده شوید.');
        set_time_limit(600);
        ini_set('memory_limit', '1024M');

        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv', 'max:51200'],
        ]);

        $path = $request->file('file')->store('imports');

        $batch = ImportBatch::create([
            'user_id' => $request->user()->id,
            'branch_id' => $request->user()->branch_id,
            'file_name' => $path,
            'original_file_name' => $request->file('file')->getClientOriginalName(),
            'total_rows' => 0,
            'success_rows' => 0,
            'failed_rows' => 0,
            'status' => 'processing',
            'started_at' => now(),
        ]);

        try {
            Excel::import(
                new SurveyCasesImport($batch, $request->user()),
                Storage::path($path)
            );

            $batch->refresh();

            ActivityLog::create([
                'user_id' => $request->user()->id,
                'branch_id' => $batch->branch_id,
                'action' => 'excel_imported',
                'description' => 'بارگذاری فایل اکسل: ' . $batch->original_file_name,
                'subject_type' => ImportBatch::class,
                'subject_id' => $batch->id,
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);

            return response()->json([
                'message' => 'فایل اکسل پردازش شد.',
                'import_batch' => $batch,
            ]);
        } catch (\Throwable $e) {
            Log::error('Excel import failed', [
                'batch_id' => $batch->id,
                'message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            $batch->update([
                'status' => 'failed',
                'finished_at' => now(),
            ]);

            return response()->json([
                'message' => 'خطا در پردازش فایل اکسل.',
                                'import_batch' => $batch->fresh(),
            ], 500);
        }
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
