<?php

namespace App\Services;

use App\Models\ImportBatch;
use App\Models\SurveyCase;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * One entry point for manual and Excel creation / re-activation.
 * A trashed operational record is restored, not duplicated or silently reassigned.
 * An immutable audit archive remains a separate table and is never used as the trash.
 */
final class CaseLifecycleService
{
    public function __construct(private CaseArchiveService $archive) {}

    /** @return array{case: SurveyCase, restored: bool} */
    public function createOrRestore(array $payload, User $actor, string $source = 'manual', ?ImportBatch $batch = null, bool $updateRestoredFields = false): array
    {
        $number = self::normalizeNumber((string) ($payload['case_number'] ?? ''));
        if ($number === '') {
            throw ValidationException::withMessages(['case_number' => 'شماره پرونده الزامی است.']);
        }
        if (mb_strlen($number) > 100) {
            throw ValidationException::withMessages(['case_number' => 'شماره پرونده بیش از حد طولانی است.']);
        }
        if (!$actor->branch_id || (int) ($payload['branch_id'] ?? 0) !== (int) $actor->branch_id) {
            throw ValidationException::withMessages(['case_number' => 'شعبه پرونده با شعبه کاربر یکسان نیست.']);
        }
        $payload['case_number'] = $number;

        return DB::transaction(function () use ($payload, $actor, $source, $batch, $number, $updateRestoredFields) {
            // The current schema has a global UNIQUE(case_number). Lock before branching;
            // the DB unique constraint is the final guard against concurrent inserts.
            $case = SurveyCase::withTrashed()->whereIn('case_number', self::numberVariants($number))
                ->lockForUpdate()->first();
            if (!$case) {
                $this->archive->assertArchivedIdentityForNewCase($payload);
                $case = SurveyCase::create($payload);
                $this->archive->capture($case, $source, $batch);
                return ['case' => $case, 'restored' => false];
            }
            if (!$case->trashed()) {
                throw ValidationException::withMessages([
                    'case_number' => 'این شماره پرونده در فهرست پرونده‌های فعال وجود دارد. برای تغییر اطلاعات، پرونده موجود را ویرایش کنید.',
                ]);
            }
            $this->assertRestoreOwnership($case, $actor);
            $this->assertSameIdentity($case, $payload);

            // Keep the original ownership, source batch and archive identity. The
            // new Excel batch must never adopt an older case (or its financial data).
            unset($payload['created_by'], $payload['branch_id'], $payload['import_batch_id'], $payload['case_archive_id'], $payload['case_number']);
            $previousArchiveId = $case->case_archive_id;
            $case->restore();
            // A plain Excel upload is NOT a revision: it only re-activates the
            // record. This avoids silently overwriting newer edits with old files.
            // Manual re-entry and explicitly confirmed Excel revisions may update.
            if ($source === 'manual' || $updateRestoredFields) {
                $case->fill($payload);
            }
            $case->updated_by = $actor->id;
            $case->save();
            $archive = $this->archive->capture($case, $source, $batch);
            if ($previousArchiveId && (int) $previousArchiveId === (int) $archive->id) {
                $archive->increment('activation_count');
            }
            return ['case' => $case, 'restored' => true];
        }, 3);
    }

    public function restoreFromTrash(SurveyCase $case, User $actor): SurveyCase
    {
        return DB::transaction(function () use ($case, $actor) {
            $case = SurveyCase::withTrashed()->whereKey($case->id)->lockForUpdate()->firstOrFail();
            $this->assertRestoreOwnership($case, $actor);
            if (!$case->trashed()) {
                throw ValidationException::withMessages(['case_number' => 'این پرونده از قبل فعال است.']);
            }
            if (SurveyCase::query()->where('case_number', $case->case_number)->where('id', '!=', $case->id)->exists()) {
                throw ValidationException::withMessages(['case_number' => 'پرونده فعال دیگری با این شماره وجود دارد.']);
            }
            $previousArchiveId = $case->case_archive_id;
            $case->restore();
            $case->updated_by = $actor->id;
            $case->save();
            $archive = $this->archive->capture($case);
            if ($previousArchiveId && (int) $previousArchiveId === (int) $archive->id) {
                $archive->increment('activation_count');
            }
            return $case;
        }, 3);
    }

    public function assertRestoreOwnership(SurveyCase $case, User $actor): void
    {
        if (!$actor->isEmployee() || !$actor->branch_id ||
            (int) $case->branch_id !== (int) $actor->branch_id ||
            (int) $case->created_by !== (int) $actor->id) {
            throw ValidationException::withMessages([
                'case_number' => 'این شماره متعلق به پرونده حذف‌شده کاربر دیگری یا شعبه دیگری است. بازیابی فقط توسط ثبت‌کننده اصلی مجاز است.',
            ]);
        }
    }

    /** Protect against re-activating a deleted number for an unrelated person. */
    public function assertSameIdentity(SurveyCase $case, array $payload): void
    {
        $oldNational = preg_replace('/\D/u', '', self::normalizeNumber((string) ($case->national_code ?? '')));
        $newNational = preg_replace('/\D/u', '', self::normalizeNumber((string) ($payload['national_code'] ?? '')));
        if ($oldNational !== '' && $newNational !== '' && $oldNational !== $newNational) {
            throw ValidationException::withMessages(['case_number' => 'شماره پرونده حذف‌شده متعلق به کد ملی دیگری است؛ بازیابی خودکار مجاز نیست.']);
        }
        if (($oldNational === '' || $newNational === '') &&
            self::normalizeName((string) $case->owner_full_name) !== self::normalizeName((string) ($payload['owner_full_name'] ?? ''))) {
            throw ValidationException::withMessages(['case_number' => 'هویت مالک پرونده حذف‌شده قابل تطبیق نیست؛ بازیابی خودکار انجام نشد.']);
        }
    }

    public static function normalizeNumber(string $number): string
    {
        $number = strtr(trim($number), [
            '۰'=>'0', '۱'=>'1', '۲'=>'2', '۳'=>'3', '۴'=>'4', '۵'=>'5', '۶'=>'6', '۷'=>'7', '۸'=>'8', '۹'=>'9',
            '٠'=>'0', '١'=>'1', '٢'=>'2', '٣'=>'3', '٤'=>'4', '٥'=>'5', '٦'=>'6', '٧'=>'7', '٨'=>'8', '٩'=>'9',
        ]);
        return preg_replace('/\s+/u', ' ', $number);
    }

    public static function numberVariants(string $number): array
    {
        return array_unique([
            $number,
            strtr($number, ['0'=>'۰','1'=>'۱','2'=>'۲','3'=>'۳','4'=>'۴','5'=>'۵','6'=>'۶','7'=>'۷','8'=>'۸','9'=>'۹']),
            strtr($number, ['0'=>'٠','1'=>'١','2'=>'٢','3'=>'٣','4'=>'٤','5'=>'٥','6'=>'٦','7'=>'٧','8'=>'٨','9'=>'٩']),
        ]);
    }

    private static function normalizeName(string $name): string
    {
        return mb_strtolower(preg_replace('/\s+/u', ' ', trim(str_replace(['ي','ك'], ['ی','ک'], $name))), 'UTF-8');
    }
}
