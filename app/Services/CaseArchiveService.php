<?php

namespace App\Services;

use App\Models\ArchivedImportFile;
use App\Models\CaseArchive;
use App\Models\ImportBatch;
use App\Models\SurveyCase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

final class CaseArchiveService
{
    public function capture(SurveyCase $case, string $source = 'manual', ?ImportBatch $batch = null): CaseArchive
    {
        if (!$case->exists) {
            throw new \LogicException('Only saved cases can be archived.');
        }
        $branchId = $case->branch_id ? (int) $case->branch_id : null;
        $number = trim((string) $case->case_number);
        if ($number === '') throw new \LogicException('Archived case must have a case number.');
        // Stable identity, independent of employee, import batch ID and operational row ID.
        $normalizedNumber = strtr($number, [
            '۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4',
            '۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
            '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4',
            '٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9',
        ]);
        $normalizedNumber = mb_strtolower(preg_replace('/\s+/u', ' ', $normalizedNumber), 'UTF-8');
        $identity = hash('sha256', (string)($branchId ?? 0).'|'.$normalizedNumber);
        $snapshot = Crypt::encryptString(json_encode($case->getAttributes(), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));

        $archive = CaseArchive::query()->where('identity_hash', $identity)->lockForUpdate()->first();
        if ($archive) {
            // The archive may have many historical activations, but only one active work row.
            if (SurveyCase::query()->where('case_archive_id', $archive->id)
                ->where('id', '!=', $case->id)->exists()) {
                throw ValidationException::withMessages([
                    'case_number' => 'این پرونده همچنان در بخش عملیاتی وجود دارد؛ ابتدا پرونده موجود را بررسی کنید.',
                ]);
            }
            // Never let a new employee inherit a hard-deleted case from the
            // permanent archive, even when the old operational row is gone.
            if ((int) $case->case_archive_id !== (int) $archive->id
                && $archive->first_actor_id !== null
                && (int) $archive->first_actor_id !== (int) $case->created_by) {
                throw ValidationException::withMessages([
                    'case_number' => 'سابقه این شماره پرونده در آرشیو متعلق به ثبت‌کننده دیگری است؛ به مدیر مراجعه کنید.',
                ]);
            }
            // Prevent an unrelated person from inheriting the same historical case number.
            $first = json_decode(Crypt::decryptString($archive->first_snapshot_ciphertext), true, 512, JSON_THROW_ON_ERROR);
            $firstNational = preg_replace('/\D+/u', '', (string)($first['national_code'] ?? ''));
            $newNational = preg_replace('/\D+/u', '', (string)($case->national_code ?? ''));
            if ($firstNational !== '' && $newNational !== '' && $firstNational !== $newNational) {
                throw ValidationException::withMessages([
                    'case_number' => 'این شماره پرونده در آرشیو متعلق به کد ملی دیگری است. برای بررسی به مدیر مراجعه کنید.',
                ]);
            }
            if ((int) $case->case_archive_id !== (int) $archive->id &&
                ($firstNational === '' || $newNational === '') &&
                mb_strtolower(trim((string) ($first['owner_full_name'] ?? '')), 'UTF-8') !==
                mb_strtolower(trim((string) ($case->owner_full_name ?? '')), 'UTF-8')) {
                throw ValidationException::withMessages([
                    'case_number' => 'هویت مالک در آرشیو قابل تطبیق نیست؛ برای بررسی به مدیر مراجعه کنید.',
                ]);
            }
        }
        if (!$archive) {
            $actorId = $case->created_by;
            $actor = $actorId ? DB::table('users')->where('id', $actorId)->value('name') : null;
            $archive = CaseArchive::create([
                'identity_hash' => $identity,
                'branch_id' => $branchId,
                'case_number' => $number,
                'first_source' => in_array($source, ['excel', 'manual', 'legacy'], true) ? $source : 'legacy',
                'first_actor_id' => $actorId,
                'first_actor_name' => $actor,
                'first_import_batch_id' => $batch?->id ?? $case->import_batch_id,
                'first_file_hash' => $batch?->file_hash,
                'first_snapshot_ciphertext' => $snapshot,
                'latest_snapshot_ciphertext' => $snapshot,
                'activation_count' => 1,
                'last_seen_at' => now(),
            ]);
        } else {
            // The original imported/manual snapshot stays untouched. Only latest state changes.
            $archive->latest_snapshot_ciphertext = $snapshot;
            $archive->last_seen_at = now();
            if ((int) $case->case_archive_id !== (int) $archive->id) {
                $archive->activation_count = (int) $archive->activation_count + 1;
            }
            $archive->save();
        }
        if ((int) $case->case_archive_id !== (int) $archive->id) {
            // saveQuietly avoids recursively firing observers on the operational record.
            $case->case_archive_id = $archive->id;
            $case->saveQuietly();
        }
        return $archive;
    }

    /**
     * Preflight for legacy hard-deleted records that exist ONLY in the archive.
     * This prevents creating an unrelated operational row before the encrypted
     * archive's ownership/identity check is reached (important on old MyISAM DBs).
     */
    public function assertArchivedIdentityForNewCase(array $payload): void
    {
        $number = CaseLifecycleService::normalizeNumber((string) ($payload['case_number'] ?? ''));
        $identity = hash('sha256', (int) ($payload['branch_id'] ?? 0).'|'
            .mb_strtolower(preg_replace('/\s+/u', ' ', $number), 'UTF-8'));
        $archive = CaseArchive::query()->where('identity_hash', $identity)->first();
        if (!$archive) return;

        if ($archive->first_actor_id !== null &&
            (int) $archive->first_actor_id !== (int) ($payload['created_by'] ?? 0)) {
            throw ValidationException::withMessages([
                'case_number' => 'پرونده قدیمی با این شماره متعلق به ثبت‌کننده دیگری است؛ بازیابی آن نیازمند بررسی مدیر است.',
            ]);
        }
        $first = json_decode(Crypt::decryptString($archive->first_snapshot_ciphertext), true, 512, JSON_THROW_ON_ERROR);
        $oldCode = preg_replace('/\D/u', '', CaseLifecycleService::normalizeNumber((string) ($first['national_code'] ?? '')));
        $newCode = preg_replace('/\D/u', '', CaseLifecycleService::normalizeNumber((string) ($payload['national_code'] ?? '')));
        if ($oldCode !== '' && $newCode !== '' && $oldCode !== $newCode) {
            throw ValidationException::withMessages([
                'case_number' => 'کد ملی پرونده در آرشیو با پرونده جدید یکسان نیست.',
            ]);
        }
        if ($oldCode === '' || $newCode === '') {
            $clean = static fn ($v) => mb_strtolower(preg_replace('/\s+/u', ' ', trim(str_replace(
                ['ي', 'ك'], ['ی', 'ک'], (string) $v))), 'UTF-8');
            if ($clean($first['owner_full_name'] ?? '') !== $clean($payload['owner_full_name'] ?? '')) {
                throw ValidationException::withMessages([
                    'case_number' => 'نام مالک در آرشیو با پرونده جدید یکسان نیست.',
                ]);
            }
        }
    }

    /** Archive an uploaded file in a non-public disk directory, once per branch+hash. */
    public function rememberFile(ImportBatch $batch): void
    {
        if (!$batch->branch_id || !$batch->file_hash || !$batch->file_name) {
            throw new \RuntimeException('Import source is missing branch, hash or original file.');
        }
        $existingFile = ArchivedImportFile::query()->where('branch_id', $batch->branch_id)
            ->where('file_hash', $batch->file_hash)->first();
        $privateDisk = Storage::disk('local');
        if ($existingFile && $privateDisk->exists($existingFile->storage_path)) return;

        $extension = strtolower(pathinfo($batch->file_name, PATHINFO_EXTENSION)) ?: 'xlsx';
        $path = 'imports-archive/'.$batch->branch_id.'/'.$batch->file_hash.'.'.$extension;
        if (!$privateDisk->exists($path)) {
            // The import source might live on a different configured disk.
            // Stream it into the PRIVATE local disk without holding the file in RAM.
            $stream = Storage::readStream($batch->file_name);
            if (!is_resource($stream)) {
                throw new \RuntimeException('Cannot read Excel source for private archiving.');
            }
            try {
                if (!$privateDisk->put($path, $stream)) {
                    throw new \RuntimeException('Could not preserve private original Excel archive.');
                }
            } finally {
                fclose($stream);
            }
        }
        if ($existingFile) {
            $existingFile->storage_path = $path;
            $existingFile->save();
            return;
        }
        ArchivedImportFile::firstOrCreate([
            'branch_id' => $batch->branch_id, 'file_hash' => $batch->file_hash,
        ], [
            'original_file_name' => $batch->original_file_name,
            'storage_path' => $path,
            'first_actor_id' => $batch->user_id,
        ]);
    }

    /**
     * Permanently removes the *working* case only. Never deletes the permanent archive.
     * Must be called under DB::transaction. Reject cases tied to financial/legal attachments.
     */
    public function removeWorkCase(SurveyCase $case, ?ImportBatch $batch = null): void
    {
        abort_unless($case->trashed(), 409, 'برای حذف دائمی، پرونده باید ابتدا به سطل زباله منتقل شود.');
        if (Schema::hasTable('financial_invoices') && DB::table('financial_invoices')
            ->where('survey_case_id', $case->id)->exists()) {
            abort(409, 'این پرونده فاکتور مالی دارد؛ قبل از حذف عملیاتی باید تکلیف فاکتور مشخص شود.');
        }
        if (Schema::hasTable('case_documents') && DB::table('case_documents')
            ->where('case_id', $case->id)->exists()) {
            abort(409, 'این پرونده سند پیوست دارد؛ برای جلوگیری از ازبین‌رفتن مستندات، حذف متوقف شد.');
        }
        $archive = $this->capture($case, $case->import_batch_id ? 'excel' : 'manual', $batch);
        if (Schema::hasTable('case_actions')) {
            $actions = DB::table('case_actions')->where('case_id', $case->id)->get()->map(fn ($row) => (array) $row)->all();
            if ($actions !== []) {
                $previous = $archive->linked_actions_ciphertext
                    ? json_decode(Crypt::decryptString($archive->linked_actions_ciphertext), true, 512, JSON_THROW_ON_ERROR) : [];
                $archive->linked_actions_ciphertext = Crypt::encryptString(json_encode(
                    array_merge($previous, $actions), JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR
                ));
                $archive->save();
                DB::table('case_actions')->where('case_id', $case->id)->delete();
            }
        }
        if (Schema::hasTable('case_access_grants')) {
            DB::table('case_access_grants')->where('survey_case_id', $case->id)->delete();
        }
        $case->forceDelete();
    }
}
