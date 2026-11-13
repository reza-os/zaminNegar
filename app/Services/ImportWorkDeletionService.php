<?php

namespace App\Services;

use App\Models\ImportBatch;
use App\Models\SurveyCase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Schema;

/** Soft-delete an import group; cases remain recoverable in each creator's trash. */
final class ImportWorkDeletionService
{
    public function __construct(private CaseArchiveService $archive) {}

    public function deleteBatch(ImportBatch $batch): int
    {
        return DB::transaction(function () use ($batch) {
            $batch = ImportBatch::query()->whereKey($batch->id)->lockForUpdate()->firstOrFail();
            abort_if($batch->status === 'processing', 409, 'گروه هنوز در حال پردازش است.');

            if ($batch->file_name && Storage::exists($batch->file_name) && $batch->file_hash) {
                $this->archive->rememberFile($batch);
            }
            $deleted = 0;
            SurveyCase::query()->where('import_batch_id', $batch->id)
                ->orderBy('id')->chunkById(200, function ($cases) use (&$deleted) {
                    foreach ($cases as $case) {
                        $case->delete();
                        $this->archive->capture($case);
                        $deleted++;
                    }
                });

            // Batch-level sharing must not silently become active again if a
            // deleted case is later restored. The manager may grant access anew.
            if (Schema::hasTable('case_access_grants')) {
                DB::table('case_access_grants')->where('import_batch_id', $batch->id)->delete();
            }
            // Preserve cases, original source and import error reports for recovery.
            $batch->delete();
            return $deleted;
        }, 3);
    }
}
