<?php

namespace App\Imports;

use App\Models\ImportBatch;
use App\Models\ImportError;
use App\Models\LookupItem;
use App\Models\SurveyCase;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Collection;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithChunkReading;
use Maatwebsite\Excel\Concerns\WithStartRow;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

class SurveyCasesImport implements ToCollection, WithStartRow, WithChunkReading
{
    private int $totalRows = 0;
    private int $successRows = 0;
    private int $failedRows = 0;
    private int $physicalRow = 1;

    /** When populated, process only the original failing Excel row numbers. */
    private ?array $retryRowSet = null;

    /** Legacy batches may have generated IMP-{batchId}-{row} case numbers. */
    private array $legacySameFileBatchIds = [];

    private array $lookupCache = [];
    private array $userCache = [];

    public function __construct(
        private ImportBatch $importBatch,
        private User $user,
        ?array $retryRowNumbers = null,
    ) {
        if ($this->importBatch->file_hash) {
            // One query per import, not per row; handles hashes backfilled for old files.
            $this->legacySameFileBatchIds = ImportBatch::withTrashed()
                ->where('branch_id', $this->importBatch->branch_id)
                ->where('file_hash', $this->importBatch->file_hash)
                ->pluck('id')->map(fn ($id) => (int) $id)->all();
        }
        if ($retryRowNumbers !== null) {
            $this->retryRowSet = array_fill_keys(array_map('intval', $retryRowNumbers), true);
            $this->totalRows = (int) $this->importBatch->total_rows;
            $this->successRows = (int) $this->importBatch->success_rows;
            $this->failedRows = (int) $this->importBatch->failed_rows;
        }
    }

    public function startRow(): int
    {
        return 2;
    }

    public function chunkSize(): int
    {
        return 300;
    }

    public function collection(Collection $rows): void
    {
        foreach ($rows as $index => $row) {
            $rowArray = array_values($row->toArray());
            $excelRowNumber = ++$this->physicalRow;

            if ($this->retryRowSet !== null && !isset($this->retryRowSet[$excelRowNumber])) {
                continue;
            }

            if ($this->isEmptyBusinessRow($rowArray)) {
                continue;
            }

            if ($this->retryRowSet === null) {
                $this->totalRows++;
            }

            try {
                $caseNumber = $this->text($rowArray[2] ?? null);

                $hasExplicitNumber = $caseNumber !== '';
                if ($caseNumber === '') {
                    // Identical files in the same branch yield an identical fallback number.
                    // A new import batch ID must NOT make the same row look new.
                    $hash = $this->importBatch->file_hash;
                    if (!$hash) {
                        throw new \RuntimeException('اثر انگشت فایل یافت نشد؛ ابتدا نسخه اصلی فایل را بازیابی کنید.');
                    }
                    $caseNumber = sprintf(
                        'IMP-B%d-%s-R%d',
                        (int) $this->importBatch->branch_id,
                        substr($hash, 0, 20),
                        $excelRowNumber
                    );
                }

                $ownerFullName = $this->text($rowArray[3] ?? null);

                if ($ownerFullName === '') {
                    throw new \RuntimeException('نام و نام خانوادگی خالی است.');
                }

                $surveyorName = $this->text($rowArray[8] ?? null);
                $assignedName = $this->text($rowArray[15] ?? null);

                $payload = [
                    'case_date' => $this->parseDate($rowArray[1] ?? null),
                    'case_date_jalali' => $this->dateText($rowArray[1] ?? null),

                    'case_number' => $caseNumber,
                    'owner_full_name' => $ownerFullName,
                    'father_name' => $this->textOrNull($rowArray[4] ?? null),
                    'national_code' => $this->nationalCode($rowArray[5] ?? null),

                    'birth_date' => $this->parseDate($rowArray[6] ?? null),
                    'birth_date_jalali' => $this->dateText($rowArray[6] ?? null),

                    'village_name' => $this->textOrNull($rowArray[7] ?? null),
                    'surveyor_id' => $this->findUserIdByName($surveyorName),
                    'surveyor_name_raw' => $surveyorName ?: null,

                    'postal_code' => $this->textOrNull($rowArray[9] ?? null),
                    'phone' => $this->phone($rowArray[10] ?? null),

                    'file_location' => $this->textOrNull($rowArray[11] ?? null),
                    'description' => $this->textOrNull($rowArray[12] ?? null),

                    'status_id' => $this->lookupId('case_status', $rowArray[13] ?? null, 'جدید'),
                    'stage_id' => $this->lookupId('case_stage', $rowArray[14] ?? null, 'ثبت اولیه'),
                    'assigned_user_id' => $this->findUserIdByName($assignedName),
                    'priority_id' => $this->lookupId('priority', $rowArray[16] ?? null, 'عادی'),

                    'last_action_at' => $this->parseDate($rowArray[17] ?? null),
                    'last_action_at_jalali' => $this->dateText($rowArray[17] ?? null),

                    'next_action' => $this->textOrNull($rowArray[18] ?? null),
                    'next_action_at' => $this->parseDate($rowArray[19] ?? null),
                    'next_action_at_jalali' => $this->dateText($rowArray[19] ?? null),

                    'followup_status_id' => $this->lookupIdNullable('followup_status', $rowArray[20] ?? null),
                    'stop_reason_id' => $this->lookupIdNullable('stop_reason', $rowArray[22] ?? null),

                    'contract_amount' => $this->money($rowArray[23] ?? null),
                    'received_amount' => $this->money($rowArray[24] ?? null),

                    'customer_source_id' => $this->lookupIdNullable('customer_source', $rowArray[26] ?? null),
                    'financial_status_id' => $this->lookupIdNullable('financial_status', $rowArray[27] ?? null),
                    'physical_status_id' => $this->lookupIdNullable('physical_status', $rowArray[28] ?? null),

                    'archive_code' => $this->textOrNull($rowArray[29] ?? null),

                    'branch_id' => $this->user->branch_id,
                    'created_by' => $this->user->id,
                    'updated_by' => $this->user->id,
                    'import_batch_id' => $this->importBatch->id,
                ];

                // Historical files used batch-scoped numbers for empty case numbers.
                // Detect those old rows as well after their source file hashes are backfilled.
                if (!$hasExplicitNumber && $this->legacySameFileBatchIds !== []) {
                    $legacyNumbers = array_map(
                        fn (int $id) => 'IMP-'.$id.'-'.$excelRowNumber,
                        $this->legacySameFileBatchIds
                    );
                    if (SurveyCase::withTrashed()->whereIn('case_number', $legacyNumbers)->exists()) {
                        throw new \RuntimeException('این ردیف بدون شماره پرونده قبلاً در بارگذاری قدیمی همین فایل ثبت شده است.');
                    }
                }

                // Each imported file owns its own set of newly-created cases.
                // Overwriting a case from a prior batch would silently move ownership
                // between import groups and break safe batch deletion.
                if (SurveyCase::withTrashed()->where('case_number', $caseNumber)->exists()) {
                    throw new \RuntimeException('شماره پرونده قبلاً ثبت شده (حتی اگر حذف نرم شده باشد)؛ ردیف تکراری ذخیره نشد.');
                }
                SurveyCase::create($payload);

                if ($this->retryRowSet !== null) {
                    ImportError::query()->where('import_batch_id', $this->importBatch->id)
                        ->where('row_number', $excelRowNumber)->delete();
                    $this->failedRows = max(0, $this->failedRows - 1);
                }
                $this->successRows++;
            } catch (\Throwable $e) {
                if ($this->retryRowSet === null) {
                    $this->failedRows++;
                } else {
                    // Replace earlier failures instead of recording duplicate error rows.
                    ImportError::query()->where('import_batch_id', $this->importBatch->id)
                        ->where('row_number', $excelRowNumber)->delete();
                }

                ImportError::create([
                    'import_batch_id' => $this->importBatch->id,
                    'row_number' => $excelRowNumber,
                    'field_name' => str_contains($e->getMessage(), 'شماره پرونده') ? 'case_number' : (str_contains($e->getMessage(), 'نام و نام خانوادگی') ? 'owner_full_name' : null),
                    'error_message' => $e->getMessage(),
                    'row_data' => $rowArray,
                ]);
            }
        }

        $this->importBatch->update([
            'total_rows' => $this->totalRows,
            'success_rows' => $this->successRows,
            'failed_rows' => $this->failedRows,
            // Do not mark a 300-row chunk as the whole file being completed.
            // Controller finalizes the batch only after all chunks finish.
        ]);
    }

    private function isEmptyBusinessRow(array $row): bool
    {
        $important = [
            $row[2] ?? null,
            $row[3] ?? null,
            $row[5] ?? null,
            $row[10] ?? null,
            $row[11] ?? null,
            $row[12] ?? null,
        ];

        foreach ($important as $value) {
            if ($this->text($value) !== '') {
                return false;
            }
        }

        return true;
    }

    private function text(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d');
        }

        if (is_float($value) && floor($value) === $value) {
            $value = (string) (int) $value;
        } elseif (is_int($value) || is_float($value)) {
            $value = (string) $value;
        } elseif (! is_string($value)) {
            $value = (string) $value;
        }

        return trim($this->persianToEnglishDigits($value));
    }

    private function textOrNull(mixed $value): ?string
    {
        $value = $this->text($value);

        if ($value === '' || str_starts_with($value, '=')) {
            return null;
        }

        return $value;
    }

    private function persianToEnglishDigits(mixed $value): string
    {
        if ($value === null) {
            return '';
        }

        return strtr((string) $value, [
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
            '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ]);
    }

    private function phone(mixed $value): ?string
    {
        $value = preg_replace('/\D+/', '', $this->text($value));

        if ($value === '') {
            return null;
        }

        if (str_starts_with($value, '98')) {
            $value = '0' . substr($value, 2);
        }

        if (strlen($value) === 10 && str_starts_with($value, '9')) {
            $value = '0' . $value;
        }

        return $value;
    }

    private function nationalCode(mixed $value): ?string
    {
        $value = preg_replace('/\D+/', '', $this->text($value));

        if ($value === '') {
            return null;
        }

        if (strlen($value) < 10) {
            $value = str_pad($value, 10, '0', STR_PAD_LEFT);
        }

        return $value;
    }

    private function money(mixed $value): float
    {
        $value = $this->text($value);

        if ($value === '' || str_starts_with($value, '=')) {
            return 0.0;
        }

        $value = str_replace(['٬', ',', 'ریال', 'تومان', ' '], '', $value);
        $value = preg_replace('/[^0-9.\-]/', '', $value);

        if ($value === '' || $value === '-' || $value === '.') {
            return 0.0;
        }

        return round((float) $value, 2);
    }

    private function dateText(mixed $value): ?string
    {
        $value = $this->text($value);

        if ($value === '' || str_starts_with($value, '=')) {
            return null;
        }

        return $value;
    }

    private function parseDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        if ($value instanceof \DateTimeInterface) {
            return Carbon::instance($value)->toDateString();
        }

        if (is_numeric($value) && (float) $value > 25000) {
            try {
                return Carbon::instance(ExcelDate::excelToDateTimeObject((float) $value))->toDateString();
            } catch (\Throwable) {
                return null;
            }
        }

        $value = str_replace(['-', '.'], '/', $this->text($value));

        if ($value === '' || str_starts_with($value, '=')) {
            return null;
        }

        if (preg_match('/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/', $value, $matches)) {
            $normalized = sprintf('%04d/%02d/%02d', $matches[1], $matches[2], $matches[3]);

            try {
                return \Morilog\Jalali\Jalalian::fromFormat('Y/m/d', $normalized)
                    ->toCarbon()
                    ->toDateString();
            } catch (\Throwable) {
                return null;
            }
        }

        try {
            return Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return null;
        }
    }

    private function lookupIdNullable(string $groupKey, mixed $title): ?int
    {
        $title = $this->text($title);

        if ($title === '' || str_starts_with($title, '=')) {
            return null;
        }

        return $this->lookupId($groupKey, $title, $title);
    }

    private function lookupId(string $groupKey, mixed $title, string $defaultTitle): int
    {
        $title = $this->text($title);

        if ($title === '' || str_starts_with($title, '=')) {
            $title = $defaultTitle;
        }

        $cacheKey = $groupKey . ':' . $title;

        if (isset($this->lookupCache[$cacheKey])) {
            return $this->lookupCache[$cacheKey];
        }

        $item = LookupItem::query()
            ->where('group_key', $groupKey)
            ->where('title', $title)
            ->first();

        if (! $item) {
            $sortOrder = ((int) LookupItem::where('group_key', $groupKey)->max('sort_order')) + 1;

            $item = LookupItem::create([
                'group_key' => $groupKey,
                'title' => $title,
                'color' => '#64748b',
                'sort_order' => $sortOrder,
                'is_active' => true,
            ]);
        }

        return $this->lookupCache[$cacheKey] = $item->id;
    }

    private function findUserIdByName(string $name): ?int
    {
        if ($name === '') {
            return null;
        }

        if (array_key_exists($name, $this->userCache)) {
            return $this->userCache[$name];
        }

        return $this->userCache[$name] = User::query()
            ->where('branch_id', $this->user->branch_id)
            ->where('name', 'like', '%' . $name . '%')
            ->value('id');
    }
}
