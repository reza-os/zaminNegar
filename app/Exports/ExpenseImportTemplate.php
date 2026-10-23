<?php

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromArray;
use Maatwebsite\Excel\Concerns\WithHeadings;

final class ExpenseImportTemplate implements FromArray, WithHeadings
{
    public function headings(): array {
        return [['شناسه هزینه','دسته هزینه','نوع هزینه','تاریخ شمسی','مبلغ','کد شعبه','توضیحات']];
    }
    public function array(): array {
        return [['EXP-001','رفت‌وآمد','direct','1405/07/01',150000,'','هزینه نمونه؛ قبل از بارگذاری حذف یا تغییر دهید']];
    }
}
