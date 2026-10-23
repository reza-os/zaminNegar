<?php

namespace App\Console\Commands;

use App\Models\ImportBatch;
use App\Models\SurveyCase;
use App\Services\CaseArchiveService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

/** One-off, operator-controlled migration of historical active and soft-deleted cases. */
final class ArchiveExistingCases extends Command
{
    protected $signature = 'cases:archive-existing
        {--dry-run : Show counts; make no changes}
        {--purge-soft-deleted : Remove only previously soft-deleted operational case rows after archiving}
        {--confirm-purge : Required for irreversible operational cleanup}';
    protected $description = 'Backfill immutable case registry; optionally purge old soft-deleted working cases.';

    public function handle(CaseArchiveService $archive): int
    {
        if (!Schema::hasTable('case_archives')) {
            $this->error('Please run php artisan migrate first.');
            return self::FAILURE;
        }
        $total = SurveyCase::withTrashed()->count();
        $soft = SurveyCase::onlyTrashed()->count();
        $files = ImportBatch::withTrashed()->count();
        $this->info("Existing cases (including trashed): {$total}; old trashed: {$soft}; import groups: {$files}");
        if ($this->option('dry-run')) {
            $this->info('DRY RUN: no records or files were changed.');
            return self::SUCCESS;
        }
        if ($this->option('purge-soft-deleted') && !$this->option('confirm-purge')) {
            $this->error('Specify --confirm-purge after a verified full database backup.');
            return self::FAILURE;
        }
        $done = 0;
        ImportBatch::withTrashed()->orderBy('id')->chunkById(100, function ($batches) use ($archive) {
            foreach ($batches as $batch) {
                // Old file hashes may have been backfilled already. Missing physical files
                // cannot be reconstructed, but their structured case snapshots still archive.
                if ($batch->file_name && Storage::exists($batch->file_name)) {
                    if (!$batch->file_hash) {
                        $hash = hash_file('sha256', Storage::path($batch->file_name));
                        if ($hash !== false) {
                            $batch->file_hash = $hash;
                            $batch->save();
                        }
                    }
                    if ($batch->file_hash && $batch->branch_id) {
                        $archive->rememberFile($batch);
                    }
                }
            }
        });
        SurveyCase::withTrashed()->orderBy('id')->chunkById(150, function ($cases) use ($archive, &$done) {
            DB::transaction(function () use ($cases, $archive, &$done) {
                foreach ($cases as $case) {
                    $batch = $case->import_batch_id
                        ? ImportBatch::withTrashed()->find($case->import_batch_id) : null;
                    $archive->capture($case, $batch ? 'excel' : 'legacy', $batch);
                    $done++;
                }
            });
        });
        $this->info("Archived {$done} historical working case snapshots without deleting any source data.");

        if ($this->option('purge-soft-deleted')) {
            // Preflight *all* old deleted cases so we don't partially purge due to attachments.
            $oldIds = SurveyCase::onlyTrashed()->pluck('id');
            if (Schema::hasTable('financial_invoices') && DB::table('financial_invoices')->whereIn('survey_case_id', $oldIds)->exists()) {
                $this->error('Purge stopped: some deleted cases have financial invoices.');
                return self::FAILURE;
            }
            if (Schema::hasTable('case_documents') && DB::table('case_documents')->whereIn('case_id', $oldIds)->exists()) {
                $this->error('Purge stopped: some deleted cases have documents.');
                return self::FAILURE;
            }
            $purged = 0;
            SurveyCase::onlyTrashed()->orderBy('id')->chunkById(100, function ($cases) use ($archive, &$purged) {
                DB::transaction(function () use ($cases, $archive, &$purged) {
                    foreach ($cases as $case) {
                        $archive->removeWorkCase($case);
                        $purged++;
                    }
                });
            });
            $this->warn("Hard-deleted {$purged} previously soft-deleted operational case rows. Permanent archives stay intact.");
            // Deleting old soft-deleted batches without surviving cases is safe.
            $oldBatchesPurged = 0;
            ImportBatch::onlyTrashed()->orderBy('id')->chunkById(100, function ($batches) use (&$oldBatchesPurged) {
                DB::transaction(function () use ($batches, &$oldBatchesPurged) {
                    foreach ($batches as $batch) {
                        if (SurveyCase::withTrashed()->where('import_batch_id', $batch->id)->exists()) continue;
                        if (Schema::hasTable('case_access_grants')) {
                            DB::table('case_access_grants')->where('import_batch_id', $batch->id)->delete();
                        }
                        DB::table('import_errors')->where('import_batch_id', $batch->id)->delete();
                        $batch->forceDelete();
                        $oldBatchesPurged++;
                    }
                });
            });
            $this->warn("Hard-deleted {$oldBatchesPurged} previously soft-deleted empty import groups.");
        }
        return self::SUCCESS;
    }
}
