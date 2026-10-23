<?php

namespace App\Services;

use App\Models\LookupItem;
use App\Models\SurveyCase;
use App\Models\User;
use App\Support\PersianCalendar;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Maatwebsite\Excel\Concerns\ToArray;
use Maatwebsite\Excel\Facades\Excel;
use PhpOffice\PhpSpreadsheet\Shared\Date as ExcelDate;

/** Opt-in, preview-first reconciliation. Never changes the immutable original archive snapshot. */
final class ExcelRevisionService
{
    private array $lookupCache = [];
    private array $assigneeCache = [];

    private const COLUMNS = [
        1=>'case_date_jalali', 3=>'owner_full_name', 4=>'father_name', 5=>'national_code',
        6=>'birth_date_jalali', 7=>'village_name', 8=>'surveyor_name_raw', 9=>'postal_code',
        10=>'phone', 11=>'file_location', 12=>'description', 13=>'status_id',
        14=>'stage_id', 15=>'assigned_user_id', 16=>'priority_id',
        17=>'last_action_at_jalali', 18=>'next_action', 19=>'next_action_at_jalali',
        20=>'followup_status_id',22=>'stop_reason_id',23=>'contract_amount',
        24=>'received_amount',26=>'customer_source_id',27=>'financial_status_id',
        28=>'physical_status_id',29=>'archive_code',
    ];
    private const LOOKUPS = [
        'status_id'=>'case_status','stage_id'=>'case_stage','priority_id'=>'priority',
        'followup_status_id'=>'followup_status','stop_reason_id'=>'stop_reason',
        'customer_source_id'=>'customer_source','financial_status_id'=>'financial_status',
        'physical_status_id'=>'physical_status',
    ];
    private const DATES = [
        'case_date_jalali'=>'case_date','birth_date_jalali'=>'birth_date',
        'last_action_at_jalali'=>'last_action_at','next_action_at_jalali'=>'next_action_at',
    ];

    private function text(mixed $raw): string {
        if ($raw instanceof \DateTimeInterface) return $raw->format('Y-m-d');
        return PersianCalendar::digits(trim((string)($raw ?? '')));
    }
    private function candidate(int $index, mixed $raw, User $actor, array &$warnings, int $line): array {
        $key=self::COLUMNS[$index];
        $v=$this->text($raw);
        if ($v === '' || str_starts_with($v,'=')) return []; // blank cells NEVER erase existing data
        if (isset(self::DATES[$key])) {
            if (is_numeric($raw) && (float)$raw > 25000) {
                $date=ExcelDate::excelToDateTimeObject((float)$raw);
                $sql=$date->format('Y-m-d');
                $jalali=\Morilog\Jalali\Jalalian::fromCarbon(\Carbon\Carbon::parse($sql))->format('Y/m/d');
            } else {
                $normalized=str_replace(['-','.'],'/',$v);
                if (preg_match('/^1[34][0-9]{2}\\/\\d{1,2}\\/\\d{1,2}$/',$normalized)) {
                    [$year,$month,$day]=array_map('intval',explode('/',$normalized));
                    $jalali=sprintf('%04d/%02d/%02d',$year,$month,$day);
                    $sql=PersianCalendar::day($jalali,$key);
                } else {
                    $warnings[]="ردیف {$line}: تاریخ {$key} قابل تبدیل نبود و نادیده گرفته شد.";
                    return [];
                }
            }
            return [$key=>$jalali,self::DATES[$key]=>$sql];
        }
        if (isset(self::LOOKUPS[$key])) {
            $cacheKey=self::LOOKUPS[$key].'|'.$v;
            if(!array_key_exists($cacheKey,$this->lookupCache)) {
                $this->lookupCache[$cacheKey]=LookupItem::query()->where('group_key',self::LOOKUPS[$key])->where('title',$v)->value('id');
            }
            $found=$this->lookupCache[$cacheKey];
            if (!$found) { $warnings[]="ردیف {$line}: مقدار وضعیت {$v} در تنظیمات یافت نشد؛ تغییر نخواهد کرد."; return []; }
            return [$key=>(int)$found];
        }
        if ($key==='assigned_user_id') {
            if(!array_key_exists($v,$this->assigneeCache)) {
                $this->assigneeCache[$v]=User::query()->where('branch_id',$actor->branch_id)->where('name',$v)
                    ->whereIn('role',['employee','surveyor'])->pluck('id')->all();
            }
            $ids=$this->assigneeCache[$v];
            if(count($ids)!==1){$warnings[]="ردیف {$line}: مسئول پرونده {$v} دقیقاً یک کارمند متناظر ندارد.";return [];}
            return [$key=>(int)$ids[0]];
        }
        if (in_array($key,['contract_amount','received_amount'],true)) {
            $amount=str_replace(['٬',',','ریال','تومان',' '],'',$v);
            if(!is_numeric($amount)||(float)$amount<0){$warnings[]="ردیف {$line}: مبلغ نامعتبر در {$key}.";return [];}
            return [$key=>number_format((float)$amount,2,'.','')];
        }
        if (in_array($key,['national_code','postal_code','phone'],true)) {
            $v=preg_replace('/\\D+/u','',$v);
            if($key==='national_code' && strlen($v)<10) $v=str_pad($v,10,'0',STR_PAD_LEFT);
        }
        if (mb_strlen($v) > ($key==='description'?3000:255)) {
            $warnings[]="ردیف {$line}: مقدار {$key} طولانی است.";return [];
        }
        return [$key=>$v];
    }
    private function parse(string $path,User $actor): array {
        $reader=new class implements ToArray { public function array(array $array):void {} };
        $sheets=Excel::toArray($reader,Storage::disk('local')->path($path));
        $rows=$sheets[0]??[];
        if(count($rows)<2 || count($rows)>10001) throw ValidationException::withMessages(['file'=>'فایل باید بین ۱ تا ۱۰٬۰۰۰ ردیف داشته باشد.']);
        $manifest=[];$warnings=[];$seen=[];$counts=['updated'=>0,'unchanged'=>0,'new'=>0,'skipped'=>0];
        $numbers=array_values(array_unique(array_filter(array_map(fn($row)=>$this->text($row[2]??null),array_slice($rows,1)))));
        $existing=collect();
        foreach(array_chunk($numbers,450) as $chunk) {
            $existing=$existing->union(SurveyCase::query()->whereIn('case_number',$chunk)->get()->keyBy('case_number'));
        }
        foreach(array_slice($rows,1) as $i=>$row) {
            $line=$i+2;$number=$this->text($row[2]??null);
            $owner=$this->text($row[3]??null);
            if($number==='' && $owner==='') continue;
            if ($number==='' || isset($seen[$number])) {
                $counts['skipped']++;$warnings[]="ردیف {$line}: شماره پرونده خالی یا در همین فایل تکراری است.";continue;
            }
            $seen[$number]=true;
            $case=$existing->get($number);
            if ($case && (int)$case->branch_id!==(int)$actor->branch_id) {
                $counts['skipped']++;$warnings[]="ردیف {$line}: پرونده متعلق به شعبه دیگری است.";continue;
            }
            if ($case && (int)$case->created_by!==(int)$actor->id) {
                $counts['skipped']++;$warnings[]="ردیف {$line}: ویرایش پرونده همکار بدون مجوز تطبیق مجاز نیست.";continue;
            }
            if($case && !$case->import_batch_id) {
                $counts['skipped']++;$warnings[]="ردیف {$line}: پرونده دستی است؛ در تطبیق اکسل به‌روزرسانی نمی‌شود.";continue;
            }
            if($owner===''){$counts['skipped']++;$warnings[]="ردیف {$line}: نام مالک خالی است.";continue;}
            $payload=[];
            foreach(self::COLUMNS as $index=>$field) {
                $payload=array_merge($payload,$this->candidate($index,$row[$index]??null,$actor,$warnings,$line));
            }
            if(!$case){
                $counts['new']++;
                $manifest[]=['kind'=>'new','line'=>$line,'number'=>$number,'payload'=>$payload];
                continue;
            }
            // Immutable archive's original national ID is an identity guard; changing it needs manager review.
            if (isset($payload['national_code']) && (string)$payload['national_code']!==(string)$case->national_code) {
                unset($payload['national_code']);
                $warnings[]="ردیف {$line}: تغییر کد ملی به بررسی مدیر نیاز دارد؛ اعمال نمی‌شود.";
            }
            $changed=[];$old=[];
            foreach($payload as $field=>$new) {
                $current=$case->getRawOriginal($field);
                if(in_array($field,['case_date','birth_date','last_action_at','next_action_at'],true) && $current!==null) $current=substr((string)$current,0,10);
                if ((string)($current??'') !== (string)($new??'')) {
                    $changed[$field]=$new; $old[$field]=$current;
                }
            }
            if(!$changed){$counts['unchanged']++;continue;}
            $counts['updated']++;
            $manifest[]=['kind'=>'update','line'=>$line,'id'=>$case->id,'number'=>$number,
                'expected_updated_at'=>(string)$case->getRawOriginal('updated_at'),
                'old'=>$old,'changes'=>$changed];
        }
        return ['manifest'=>$manifest,'counts'=>$counts,'warnings'=>array_slice($warnings,0,30)];
    }
    public function preview(\Illuminate\Http\UploadedFile $file, User $actor): array {
        $hash=hash_file('sha256',$file->getRealPath());
        $path=$file->store('excel-revision-previews','local');
        try{$result=$this->parse($path,$actor);}
        catch(\Throwable $e){Storage::disk('local')->delete($path);throw $e;}
        $token=bin2hex(random_bytes(32));
        $id=DB::table('excel_revision_previews')->insertGetId([
            'token'=>hash('sha256',$token),'user_id'=>$actor->id,'branch_id'=>$actor->branch_id,
            'file_hash'=>$hash,'original_name'=>$file->getClientOriginalName(),
            'storage_path'=>$path,'manifest_ciphertext'=>Crypt::encryptString(json_encode($result['manifest'],JSON_UNESCAPED_UNICODE|JSON_THROW_ON_ERROR)),
            'expires_at'=>now()->addMinutes(20),'created_at'=>now(),'updated_at'=>now(),
        ]);
        return ['token'=>$token,'preview_id'=>$id,'counts'=>$result['counts'],'warnings'=>$result['warnings'],
            'note'=>'سلول خالی تغییری ایجاد نمی‌کند؛ پرونده دستی و پرونده همکار به‌روزرسانی نمی‌شود. اعمال تغییرات نیازمند تأیید است.'];
    }
    public function apply(string $token,User $actor): array {
        return DB::transaction(function() use($token,$actor) {
            $preview=DB::table('excel_revision_previews')->where('token',hash('sha256',$token))->lockForUpdate()->first();
            if(!$preview||(int)$preview->user_id!==(int)$actor->id||(int)$preview->branch_id!==(int)$actor->branch_id||$preview->applied_at||now()->greaterThan($preview->expires_at)) {
                throw ValidationException::withMessages(['token'=>'پیش‌نمایش منقضی شده یا قبلاً اعمال شده است.']);
            }
            $real=hash_file('sha256',Storage::disk('local')->path($preview->storage_path));
            if($real!==$preview->file_hash) throw ValidationException::withMessages(['token'=>'فایل پیش‌نمایش تغییر کرده است.']);
            $manifest=json_decode(Crypt::decryptString($preview->manifest_ciphertext),true,512,JSON_THROW_ON_ERROR);
            // All-or-nothing: detect any concurrent edit, missing row or changed ownership before applying.
            foreach($manifest as $row) {
                if($row['kind']==='update') {
                    $case=SurveyCase::query()->whereKey($row['id'])->lockForUpdate()->first();
                    if(!$case || (int)$case->branch_id!==(int)$actor->branch_id || (int)$case->created_by!==(int)$actor->id
                        || !$case->import_batch_id || (string)$case->getRawOriginal('updated_at')!==$row['expected_updated_at']) {
                        throw ValidationException::withMessages(['token'=>'پرونده‌ای پس از پیش‌نمایش تغییر کرده است؛ ابتدا پیش‌نمایش جدید بگیرید.']);
                    }
                } else {
                    if(SurveyCase::withTrashed()->where('case_number',$row['number'])->exists()) {
                        throw ValidationException::withMessages(['token'=>'پرونده جدید با شماره تکراری شناسایی شد؛ دوباره پیش‌نمایش بگیرید.']);
                    }
                }
            }
            // Keep every confirmed revised source privately, even when it only updates existing rows.
            $extension=strtolower(pathinfo($preview->original_name,PATHINFO_EXTENSION));
            if(!in_array($extension,['xlsx','xls'],true)) $extension='xlsx';
            $archivePath='imports-archive/'.$actor->branch_id.'/'.$preview->file_hash.'.'.$extension;
            if(!Storage::disk('local')->exists($archivePath)) {
                Storage::disk('local')->put($archivePath,Storage::disk('local')->get($preview->storage_path));
            }
            \App\Models\ArchivedImportFile::firstOrCreate([
                'branch_id'=>$actor->branch_id,'file_hash'=>$preview->file_hash,
            ],[
                'original_file_name'=>$preview->original_name,'storage_path'=>$archivePath,
                'first_actor_id'=>$actor->id,
            ]);
            $newRows=array_filter($manifest,fn($row)=>$row['kind']==='new');
            $batch=null;
            if($newRows){
                $extension=strtolower(pathinfo($preview->original_name,PATHINFO_EXTENSION));
                if(!in_array($extension,['xlsx','xls'],true))$extension='xlsx';
                $source='imports/'.Str::uuid().'.'.$extension;
                Storage::put($source, Storage::disk('local')->get($preview->storage_path));
                $batch=\App\Models\ImportBatch::create([
                    'user_id'=>$actor->id,'branch_id'=>$actor->branch_id,
                    'file_name'=>$source,'original_file_name'=>$preview->original_name,'file_hash'=>$preview->file_hash,
                    'total_rows'=>count($newRows),'success_rows'=>count($newRows),'failed_rows'=>0,
                    'status'=>'completed','started_at'=>now(),'finished_at'=>now(),
                ]);
                // Operational source for this group must remain available for audits/retry.
                app(CaseArchiveService::class)->rememberFile($batch);
            }
            $updated=0;$created=0;
            foreach($manifest as $row) {
                if($row['kind']==='update') {
                    $case=SurveyCase::query()->findOrFail($row['id']);
                    $case->fill([...$row['changes'],'updated_by'=>$actor->id]);$case->save();
                    app(CaseArchiveService::class)->capture($case,'excel');
                    \App\Models\ActivityLog::create([
                        'user_id'=>$actor->id,'branch_id'=>$case->branch_id,'action'=>'case_excel_revision',
                        'description'=>'به‌روزرسانی اکسل پرونده «'.$case->owner_full_name.'» ('.$case->case_number.')',
                        'subject_type'=>SurveyCase::class,'subject_id'=>$case->id,
                        'old_values'=>$row['old'],'new_values'=>$row['changes'],
                    ]);
                    $updated++;
                } else {
                    $payload=[...$row['payload'],'case_number'=>$row['number'],
                        'branch_id'=>$actor->branch_id,'created_by'=>$actor->id,'updated_by'=>$actor->id,
                        'import_batch_id'=>$batch->id];
                    $payload['owner_full_name']??='بدون نام';
                    if (empty($payload['owner_full_name'])) {
                        throw ValidationException::withMessages(['token'=>'پرونده جدید فاقد نام مالک معتبر است.']);
                    }
                    // Existing importer gives defaults to these mandatory lookup fields.
                    foreach(['status_id'=>['case_status','جدید'], 'stage_id'=>['case_stage','ثبت اولیه'], 'priority_id'=>['priority','عادی']] as $key=>$pair) {
                        if (empty($payload[$key])) {
                            $payload[$key]=LookupItem::firstOrCreate(['group_key'=>$pair[0],'title'=>$pair[1]],
                                ['color'=>'#64748b','sort_order'=>1,'is_active'=>true])->id;
                        }
                    }
                    $case=SurveyCase::create($payload);
                    app(CaseArchiveService::class)->capture($case,'excel',$batch);
                    $created++;
                }
            }
            DB::table('excel_revision_previews')->where('id',$preview->id)->update(['applied_at'=>now(),'updated_at'=>now()]);
            return ['updated'=>$updated,'created'=>$created,'message'=>'تغییرات تأییدشده اعمال شدند؛ آرشیو نسخه اولیه محفوظ است.'];
        },3);
    }
}
