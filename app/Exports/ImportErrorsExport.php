<?php

namespace App\Exports;

use App\Models\ImportError;
use Illuminate\Database\Eloquent\Builder;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;

/** Export only diagnostic columns, not the customer's personal information. */
class ImportErrorsExport implements FromQuery, WithHeadings, WithMapping
{
    public function __construct(private readonly int $batchId) {}

    public function query(): Builder
    {
        return ImportError::query()->where('import_batch_id', $this->batchId)
            ->orderBy('row_number')->orderBy('id');
    }

    public function headings(): array
    {
        return ['شماره ردیف در اکسل', 'نام فیلد', 'علت خطا'];
    }

    public function map($error): array
    {
        return [
            (int) $error->row_number,
            $this->safeText((string) ($error->field_name ?? '')),
            $this->safeText((string) $error->error_message),
        ];
    }

    private function safeText(string $text): string
    {
        // Excel treats strings starting with =,+,-,@ as formulas. Force literal text.
        return preg_match('/^[\\s\\x00-\\x1f]*[=+\\-@]/u', $text) ? "'".$text : $text;
    }
}
