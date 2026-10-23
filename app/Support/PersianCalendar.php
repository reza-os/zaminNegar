<?php

namespace App\Support;

use Morilog\Jalali\Jalalian;
use Illuminate\Validation\ValidationException;

final class PersianCalendar
{
    public static function digits(string $input): string
    {
        return strtr(trim($input), ['۰'=>'0','۱'=>'1','۲'=>'2','۳'=>'3','۴'=>'4','۵'=>'5','۶'=>'6','۷'=>'7','۸'=>'8','۹'=>'9',
            '٠'=>'0','١'=>'1','٢'=>'2','٣'=>'3','٤'=>'4','٥'=>'5','٦'=>'6','٧'=>'7','٨'=>'8','٩'=>'9']);
    }

    public static function day(?string $jalali, string $field): ?string
    {
        if ($jalali === null || trim($jalali) === '') return null;
        $s = str_replace('-', '/', self::digits($jalali));
        if (!preg_match('/^1[34][0-9]{2}\\/(0[1-9]|1[0-2])\\/(0[1-9]|[12][0-9]|3[01])$/', $s)) {
            throw ValidationException::withMessages([$field => 'تاریخ باید به‌صورت ۱۴۰۵/۰۷/۰۱ وارد شود.']);
        }
        try {
            return Jalalian::fromFormat('Y/m/d', $s)->toCarbon()->format('Y-m-d');
        } catch (\Throwable $e) {
            throw ValidationException::withMessages([$field => 'تاریخ شمسی معتبر نیست.']);
        }
    }

    /** Persian month bounds represented as Gregorian dates for SQL comparisons. */
    public static function month(string $period): array
    {
        $s = str_replace('-', '/', self::digits($period));
        if (!preg_match('/^1[34][0-9]{2}\\/(0[1-9]|1[0-2])$/', $s)) {
            throw ValidationException::withMessages(['period_jalali' => 'ماه را به صورت ۱۴۰۵/۰۷ بنویسید.']);
        }
        $start = self::day($s.'/01', 'period_jalali');
        [$year, $month] = array_map('intval', explode('/', $s));
        $nextMonth = $month === 12 ? 1 : $month + 1;
        $nextYear = $month === 12 ? $year + 1 : $year;
        $next = self::day(sprintf('%04d/%02d/01', $nextYear, $nextMonth), 'period_jalali');
        return [$start, $next, str_replace('/', '-', $s)];
    }
}
