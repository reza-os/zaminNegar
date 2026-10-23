<?php

namespace App\Services;

use App\Support\PersianCalendar;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Concerns\ToArray;
use Maatwebsite\Excel\Facades\Excel;

final class ExpenseExcelImportService
{
    public function import(UploadedFile $file, int $actorId): array
    {
        $hash = hash_file('sha256', $file->getRealPath());
        if (DB::table('finance_expense_imports')->where('file_hash',$hash)->exists()) {
            throw ValidationException::withMessages(['file' => 'این فایل هزینه قبلاً ثبت شده است؛ ورود دوباره متوقف شد.']);
        }
        $reader = new class implements ToArray { public function array(array $array): void {} };
        $sheets = Excel::toArray($reader, $file);
        $rows = $sheets[0] ?? [];
        if (count($rows) < 2 || count($rows) > 10001) {
            throw ValidationException::withMessages(['file' => 'فایل باید بین ۱ تا ۱۰٬۰۰۰ ردیف هزینه داشته باشد.']);
        }
        $actualHeader = array_map(fn($x) => trim((string)$x), array_slice($rows[0],0,7));
        $expected = ['شناسه هزینه','دسته هزینه','نوع هزینه','تاریخ شمسی','مبلغ','کد شعبه','توضیحات'];
        if ($actualHeader !== $expected) {
            throw ValidationException::withMessages(['file' => 'ستون‌های فایل با قالب استاندارد مطابقت ندارد. قالب را دانلود کنید؛ فایل فعلی به تغییری نیاز دارد.']);
        }
        $prepared = []; $seen=[]; $errors=[];
        foreach (array_slice($rows,1) as $i => $row) {
            $line = $i + 2;
            if (!array_filter($row, fn($v) => trim((string)$v) !== '')) continue;
            $key = trim(PersianCalendar::digits((string)($row[0] ?? '')));
            $category = trim((string)($row[1] ?? ''));
            $type = strtolower(trim((string)($row[2] ?? '')));
            $date = PersianCalendar::digits((string)($row[3] ?? ''));
            $amount = str_replace([',','٬',' '], '', PersianCalendar::digits((string)($row[4] ?? '')));
            $branchCode = trim(PersianCalendar::digits((string)($row[5] ?? '')));
            $description = trim((string)($row[6] ?? ''));
            // Stable expense identity is required: changed amounts cannot silently insert a second expense.
            if ($key === '' || mb_strlen($key)>150 || isset($seen[$key])) { $errors[]="ردیف {$line}: شناسه هزینه خالی یا تکراری است."; continue; }
            $seen[$key]=true;
            if ($category === '' || mb_strlen($category)>120 || !in_array($type,['direct','fixed'],true)) { $errors[]="ردیف {$line}: دسته یا نوع هزینه نامعتبر است."; continue; }
            if (!is_numeric($amount) || (float)$amount<=0) { $errors[]="ردیف {$line}: مبلغ معتبر نیست."; continue; }
            try { $spent = PersianCalendar::day($date,'spent_at_jalali'); } catch (ValidationException $e) { $errors[]="ردیف {$line}: تاریخ شمسی معتبر نیست."; continue; }
            $branchId = null;
            if ($branchCode !== '') {
                $branchId = DB::table('branches')->where('code',$branchCode)->where('is_active',1)->value('id');
                if (!$branchId) { $errors[]="ردیف {$line}: کد شعبه یافت نشد."; continue; }
            }
            if (mb_strlen($description)>500) { $errors[]="ردیف {$line}: توضیحات بیش از ۵۰۰ کاراکتر است."; continue; }
            $prepared[] = ['import_key'=>$key,'category'=>$category,'type'=>$type,'spent_at'=>$spent,'amount'=>$amount,
                'branch_id'=>$branchId,'description'=>$description?:null];
        }
        if ($errors !== []) {
            throw ValidationException::withMessages(['file'=>array_slice($errors,0,15)]);
        }
        if (!$prepared) throw ValidationException::withMessages(['file'=>'هیچ هزینه معتبری در فایل وجود ندارد.']);
        return DB::transaction(function () use($hash,$file,$actorId,$prepared) {
            $keys = array_column($prepared,'import_key');
            if (DB::table('financial_expenses')->whereIn('import_key',$keys)->exists()) {
                throw ValidationException::withMessages(['file'=>'یک یا چند شناسه هزینه قبلاً ثبت شده است؛ فایل تغییرکرده نیاز به تطبیق و ویرایش دارد، نه درج دوباره.']);
            }
            $id = DB::table('finance_expense_imports')->insertGetId(['file_hash'=>$hash,'original_filename'=>$file->getClientOriginalName(),
                'created_by'=>$actorId,'imported_rows'=>count($prepared),'created_at'=>now(),'updated_at'=>now()]);
            foreach(array_chunk($prepared,300) as $chunk) {
                DB::table('financial_expenses')->insert(array_map(fn($item)=>[...$item,'finance_expense_import_id'=>$id,
                    'created_by'=>$actorId,'created_at'=>now(),'updated_at'=>now()],$chunk));
            }
            return ['import_id'=>$id,'imported_rows'=>count($prepared)];
        },3);
    }
}
