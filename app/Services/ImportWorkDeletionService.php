<?php

namespace App\Services;

use App\Models\ImportBatch;
use App\Models\SurveyCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

final class ImportWorkDeletionService
{
    public function __construct(private CaseArchiveService $archive) {}

    /** Delete operational group and records atomically, keeping only permanent archives. */
    public function deleteBatch(ImportBatch $batch): int
    {
        return DB::transaction(function () use ($batch) {
            $batch = ImportBatch::query()->whereKey($batch->id)->lockForUpdate()->firstOrFail();
            abort_if($batch->status === 'processing', 409, 'گروه هنوز در حال پردازش است.');

            // Preflight before touching any row. Financial invoices and documents are legally important.
            $caseIds = SurveyCase::withTrashed()->where('import_batch_id', $batch->id)->pluck('id');
            if (Schema::hasTable('financial_invoices') && DB::table('financial_invoices')
                ->whereIn('survey_case_id', $caseIds)->exists()) {
                abort(409, 'گروه به فاکتور مالی وابسته است. حذف متوقف شد.');
            }
            if (Schema::hasTable('case_documents') && DB::table('case_documents')
                ->whereIn('case_id', $caseIds)->exists()) {
                abort(409, 'گروه سند پیوست دارد. حذف متوقف شد.');
            }

            // Make best effort to preserve source if it predates the new archiving feature.
            if ($batch->file_name && Storage::exists($batch->file_name) && $batch->file_hash) {
                $this->archive->rememberFile($batch);
            }

            $deleted = 0;
            SurveyCase::withTrashed()->where('import_batch_id', $batch->id)
                ->orderBy('id')->chunkById(200, function ($cases) use ($batch, &$deleted) {
                    foreach ($cases as $case) {
                        $this->archive->removeWorkCase($case, $batch);
                        $deleted++;
                    }
                });

            // Grants and row errors belong to the operational group, not the permanent archive.
            if (Schema::hasTable('case_access_grants')) {
                DB::table('case_access_grants')->where('import_batch_id', $batch->id)->delete();
            }
            DB::table('import_errors')->where('import_batch_id', $batch->id)->delete();
            $batch->forceDelete();
            return $deleted;
        }, 3);
    }
}
