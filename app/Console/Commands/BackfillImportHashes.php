<?php

namespace App\Console\Commands;

use App\Models\ImportBatch;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/** Safe metadata-only migration: reads files, never changes cases. */
class BackfillImportHashes extends Command
{
    protected $signature = 'imports:backfill-hashes {--dry-run : Show counts without writing hashes}';

    protected $description = 'Calculate SHA-256 hashes for old import batches whose source file still exists';

    public function handle(): int
    {
        $updated = 0;
        $missing = 0;
        $failed = 0;
        $dryRun = (bool) $this->option('dry-run');

        ImportBatch::query()->whereNull('file_hash')->whereNotNull('file_name')
            ->orderBy('id')->chunkById(100, function ($batches) use (&$updated, &$missing, &$failed, $dryRun) {
                foreach ($batches as $batch) {
                    if (!Storage::exists($batch->file_name)) {
                        $missing++;
                        continue;
                    }
                    try {
                        $hash = hash_file('sha256', Storage::path($batch->file_name));
                        if (!$hash) {
                            $failed++;
                            continue;
                        }
                        if (!$dryRun) {
                            $batch->update(['file_hash' => $hash]);
                        }
                        $updated++;
                    } catch (\Throwable $e) {
                        $failed++;
                        $this->warn('Cannot fingerprint batch ID '.$batch->id);
                    }
                }
            });

        $this->info(($dryRun ? '[DRY RUN] ' : '')."Hashed: {$updated}; missing files: {$missing}; unreadable: {$failed}");
        return self::SUCCESS;
    }
}
