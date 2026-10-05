<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Imports\SurveyCasesImport;
use App\Models\ActivityLog;
use App\Models\ImportBatch;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;

class ImportController extends Controller
{
    public function store(Request $request)
    {
        set_time_limit(600);
        ini_set('memory_limit', '1024M');

        $request->validate([
            'file' => ['required', 'file', 'mimes:xlsx,xls,csv'],
        ]);

        $path = $request->file('file')->store('imports');

        $batch = ImportBatch::create([
            'user_id' => $request->user()->id,
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
                'error' => $e->getMessage(),
                'import_batch' => $batch->fresh(),
            ], 500);
        }
    }

    public function show(ImportBatch $importBatch)
    {
        return $importBatch->load('errors');
    }
}
