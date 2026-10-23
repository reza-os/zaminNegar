<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

final class PruneExcelRevisionPreviews extends Command
{
    protected $signature = 'imports:prune-revision-previews {--dry-run : Show count without deletion}';
    protected $description = 'Remove expired Excel revision staging files and preview tokens; archived files are never touched.';

    public function handle(): int
    {
        $count = 0;
        DB::table('excel_revision_previews')
            ->where(fn($q) => $q->where('expires_at','<',now()->subHour())
                ->orWhere('applied_at','<',now()->subHour()))
            ->orderBy('id')->chunkById(100,function($rows)use(&$count){
                foreach($rows as $row){
                    $count++;
                    if($this->option('dry-run'))continue;
                    Storage::disk('local')->delete($row->storage_path);
                    DB::table('excel_revision_previews')->where('id',$row->id)->delete();
                }
            });
        $this->info("Expired revision previews: {$count}".($this->option('dry-run')?' (dry run)':''));
        return self::SUCCESS;
    }
}
