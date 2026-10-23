<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SurveyCase;
use App\Models\ActivityLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use App\Support\PersianCalendar;
use App\Exports\ExpenseImportTemplate;
use App\Services\ExpenseExcelImportService;
use Maatwebsite\Excel\Facades\Excel;

class ManagerFinanceController extends Controller
{
    /** All managers may view company-wide aggregates; employees never enter this route group. */
    public function overview(Request $request)
    {
        $input = $request->validate(['period'=>['nullable','date_format:Y-m'], 'branch_id'=>['nullable','integer','exists:branches,id'], 'period_jalali'=>['nullable','string','max:10']]);
        $period = $input['period'] ?? now()->format('Y-m');
        $branchId = $input['branch_id'] ?? null;
        $jalaliPeriod = $input['period_jalali'] ?? null;
        if ($jalaliPeriod) {
            [$from,$to,$jalaliPeriod] = PersianCalendar::month($jalaliPeriod);
        } else {
            $from = $period . '-01';
            $to = date('Y-m-d', strtotime($from . ' +1 month'));
        }

        // Summary of Excel-derived contract and receipt columns (cumulative amounts).
        $cases = SurveyCase::query()->whereNotNull('branch_id');
        if ($branchId) $cases->where('branch_id', $branchId);
        $contracts = (float)(clone $cases)->sum('contract_amount');
        $received = (float)(clone $cases)->sum('received_amount');
        $remaining = $contracts - $received;
        // This comparison uses the case creation date, NOT invoice issue or payment date.
        $monthlyCases = (clone $cases)->where('created_at','>=',$from)->where('created_at','<',$to);
        $monthlySales = (float)(clone $monthlyCases)->sum('contract_amount');
        $monthlyCollections = (float)(clone $monthlyCases)->sum('received_amount');
        $salesByEmployee = (clone $cases)
            ->select('created_by')->selectRaw('SUM(contract_amount) as sales_amount, COUNT(*) as case_count')
            ->groupBy('created_by')->orderByDesc('sales_amount')->limit(20)->get();
        $userNames = User::whereIn('id',$salesByEmployee->pluck('created_by')->filter())->pluck('name','id');
        $salesByEmployee = $salesByEmployee->map(fn($r)=>['employee_id'=>$r->created_by,
            'name'=>$userNames[$r->created_by] ?? 'کارمند غیرفعال',
            'sales_amount'=>(float)$r->sales_amount,'case_count'=>(int)$r->case_count]);

        $invoiceQuery = DB::table('financial_invoices as i')
            ->join('survey_cases as c','c.id','=','i.survey_case_id')
            ->whereNull('c.deleted_at')->whereNotNull('c.branch_id');
        if ($branchId) $invoiceQuery->where('c.branch_id', $branchId);
        $invoiceAggregate = (clone $invoiceQuery)->selectRaw('COUNT(*) as count, SUM(i.amount) as total, SUM(i.paid_amount) as paid')->first();
        $invoiceCount = (int)$invoiceAggregate->count;
        $due = (clone $invoiceQuery)->whereNotNull('i.due_at')->where('i.due_at','<=',now()->toDateString())
            ->whereColumn('i.paid_amount','<','i.amount')
            ->selectRaw('COUNT(*) as count, SUM(i.amount - i.paid_amount) as amount')->first();
        $overdue = (clone $invoiceQuery)->whereNotNull('i.due_at')->where('i.due_at','<',now()->toDateString())
            ->whereColumn('i.paid_amount','<','i.amount')
            ->selectRaw('COUNT(*) as count, SUM(i.amount - i.paid_amount) as amount')->first();
        $monthlyInvoiceTotal = (float)(clone $invoiceQuery)->where('i.issued_at','>=',$from)->where('i.issued_at','<',$to)->sum('i.amount');
        $monthlyInvoicePaid = (float)(clone $invoiceQuery)->where('i.issued_at','>=',$from)->where('i.issued_at','<',$to)->sum('i.paid_amount');

        $expenses = DB::table('financial_expenses');
        if ($branchId) $expenses->where('branch_id',$branchId);
        $expensesAll = (float)(clone $expenses)->sum('amount');
        $directExpense = (float)(clone $expenses)->where('type','direct')->sum('amount');
        $fixedExpense = (float)(clone $expenses)->where('type','fixed')->sum('amount');
        $monthlyExpenses = (float)(clone $expenses)->where('spent_at','>=',$from)->where('spent_at','<',$to)->sum('amount');
        $categories = (clone $expenses)->select('category')->selectRaw('SUM(amount) as total')
            ->groupBy('category')->orderByDesc('total')->limit(30)->get();
        $target = $branchId ? null : ($jalaliPeriod
            ? DB::table('financial_targets_jalali')->where('period_jalali',$jalaliPeriod)->first()
            : DB::table('financial_targets')->where('period',$period)->first());

        return response()->json([
            'period'=>$period,'period_jalali'=>$jalaliPeriod,'branch_id'=>$branchId,
            'contracts'=>['total'=>$contracts, 'received'=>$received, 'remaining'=>$remaining,
                'collection_percent'=>$contracts>0 ? round($received/$contracts*100,2):null,
                'monthly_sales'=>$monthlySales,'monthly_collections'=>$monthlyCollections,
                'sales_by_employee'=>$salesByEmployee],
            'invoices'=>['count'=>$invoiceCount,'total'=>$invoiceCount ? (float)$invoiceAggregate->total : null,
                'average'=>$invoiceCount ? round((float)$invoiceAggregate->total/$invoiceCount,2):null,
                'received'=>$invoiceCount ? (float)$invoiceAggregate->paid : null,
                'remaining'=>$invoiceCount ? (float)$invoiceAggregate->total-(float)$invoiceAggregate->paid : null,
                'collection_percent'=>$invoiceCount && (float)$invoiceAggregate->total > 0
                    ? round((float)$invoiceAggregate->paid/(float)$invoiceAggregate->total*100,2) : null,
                'due_count'=>$invoiceCount ? (int)$due->count : null,
                'due_amount'=>$invoiceCount ? (float)($due->amount ?? 0) : null,
                'overdue_count'=>$invoiceCount ? (int)$overdue->count : null,
                'overdue_amount'=>$invoiceCount ? (float)($overdue->amount ?? 0) : null,
                'monthly_total'=>$monthlyInvoiceTotal,'monthly_received'=>$monthlyInvoicePaid],
            'expenses'=>['total'=>$expensesAll,'direct'=>$directExpense,'fixed'=>$fixedExpense,
                'categories'=>$categories,'monthly'=>$monthlyExpenses],
            // Provisional profit based on contract amounts, not accounting revenue.
            'estimated_profit'=>['gross'=>$contracts-$directExpense,'net'=>$contracts-$expensesAll,
                'note'=>'برآورد غیرحسابداری: مبلغ قرارداد منهای هزینه‌های ثبت‌شده؛ تا ثبت همه هزینه‌ها قطعی نیست.'],
            'budget'=>['sales_target'=>$target? (float)$target->sales_target:null,
                'collection_target'=>$target? (float)$target->collection_target:null,
                'expense_target'=>$target? (float)$target->expense_target:null,
                'sales_actual'=>$monthlySales,'collection_actual'=>$monthlyCollections,
                'expense_actual'=>$monthlyExpenses,
                'sales_percent'=>$target && (float)$target->sales_target>0?round($monthlySales/$target->sales_target*100,1):null,
                'collection_percent'=>$target && (float)$target->collection_target>0?round($monthlyCollections/$target->collection_target*100,1):null],
            'meta'=>['unit'=>'واحد مبلغ مطابق داده‌های اکسل',
                'warning'=>'فاکتورها و هزینه‌ها ستون مستقل در اکسل ندارند و جداگانه ثبت می‌شوند؛ ارقام قرارداد معادل فاکتور قطعی نیستند. هزینه‌های عمومی در فیلتر شعبه تخصیص داده نمی‌شوند.'],
        ]);
    }

    /** Managers may only invoice live cases; archived rows cannot be billed by operational id. */
    public function invoiceCaseOptions(Request $request)
    {
        $data=$request->validate(['search'=>['required','string','min:2','max:80']]);
        $needle=trim($data['search']);
        $items=SurveyCase::query()->whereNotNull('branch_id')
            ->where(fn($q)=>$q->where('case_number','like','%'.$needle.'%')
                ->orWhere('owner_full_name','like','%'.$needle.'%'))
            ->orderByDesc('id')->limit(20)->get(['id','case_number','owner_full_name','branch_id']);
        return response()->json(['data'=>$items]);
    }

    public function expenseTemplate()
    {
        return Excel::download(new ExpenseImportTemplate(), 'zaminnegar-expenses-template.xlsx');
    }

    public function importExpenses(Request $request, ExpenseExcelImportService $service)
    {
        $request->validate(['file'=>['required','file','mimes:xlsx,xls','max:10240']]);
        $result=$service->import($request->file('file'), (int)$request->user()->id);
        ActivityLog::create([
            'user_id'=>$request->user()->id,'branch_id'=>null,
            'action'=>'financial_expenses_imported',
            'description'=>'ثبت گروهی '. $result['imported_rows'].' هزینه از اکسل',
            'subject_type'=>'finance_expense_import','subject_id'=>$result['import_id'],
            'ip_address'=>$request->ip(),'user_agent'=>$request->userAgent(),
        ]);
        return response()->json(['message'=>'هزینه‌ها ثبت شدند.',...$result],201);
    }

    public function addInvoice(Request $request)
    {
        $input=$request->validate([
            'case_id'=>['nullable','integer'],
            'case_number'=>['nullable','string','max:100'],
            'number'=>['required','string','max:100','unique:financial_invoices,number'],
            'issued_at_jalali'=>['required','string','max:10'],
            'due_at_jalali'=>['nullable','string','max:10'],
            'amount'=>['required','numeric','min:0.01'],
            'paid_amount'=>['required','numeric','min:0','lte:amount'],
        ]);
        if (empty($input['case_id']) && empty($input['case_number'])) {
            throw ValidationException::withMessages(['case_id'=>'ابتدا یک پرونده فعال از فهرست انتخاب کنید.']);
        }
        $query=SurveyCase::query()->whereNotNull('branch_id');
        $case=!empty($input['case_id'])
            ? $query->whereKey($input['case_id'])->first()
            : $query->where('case_number',trim($input['case_number']))->first();
        if (!$case) {
            throw ValidationException::withMessages(['case_id'=>'پرونده فعال یافت نشد؛ ممکن است قبلاً از جدول عملیاتی حذف شده باشد. ابتدا آن را بازیابی کنید.']);
        }
        $input['issued_at']=PersianCalendar::day($input['issued_at_jalali'],'issued_at_jalali');
        $input['due_at']=PersianCalendar::day($input['due_at_jalali']??null,'due_at_jalali');
        if ($input['due_at'] && $input['due_at'] < $input['issued_at']) {
            throw ValidationException::withMessages(['due_at_jalali'=>'سررسید باید برابر یا بعد از تاریخ صدور باشد.']);
        }
        unset($input['case_id'],$input['case_number'],$input['issued_at_jalali'],$input['due_at_jalali']);
        $id = DB::table('financial_invoices')->insertGetId([...$input,
            'survey_case_id'=>$case->id,'created_by'=>$request->user()->id,'created_at'=>now(),'updated_at'=>now()]);
        ActivityLog::create([
            'user_id'=>$request->user()->id, 'branch_id'=>$case->branch_id,
            'action'=>'financial_invoice_created', 'description'=>'ثبت فاکتور: '.$input['number'],
            'subject_type'=>'financial_invoice', 'subject_id'=>$id,
            'ip_address'=>$request->ip(), 'user_agent'=>$request->userAgent(),
        ]);
        return response()->json(['id'=>$id],201);
    }

    public function addExpense(Request $request)
    {
        $input = $request->validate([
            'branch_id'=>['nullable','exists:branches,id'],
            'category'=>['required','string','max:120'],
            'type'=>['required',Rule::in(['direct','fixed'])],
            'description'=>['nullable','string','max:500'],
            'amount'=>['required','numeric','min:0.01'],
            'spent_at_jalali'=>['required','string','max:10'],
        ]);
        $input['spent_at']=PersianCalendar::day($input['spent_at_jalali'],'spent_at_jalali');
        unset($input['spent_at_jalali']);
        $id = DB::table('financial_expenses')->insertGetId([...$input,
            'created_by'=>$request->user()->id,'created_at'=>now(),'updated_at'=>now()]);
        ActivityLog::create([
            'user_id'=>$request->user()->id, 'branch_id'=>$input['branch_id'] ?? null,
            'action'=>'financial_expense_created', 'description'=>'ثبت هزینه: '.$input['category'],
            'subject_type'=>'financial_expense', 'subject_id'=>$id,
            'ip_address'=>$request->ip(), 'user_agent'=>$request->userAgent(),
        ]);
        return response()->json(['id'=>$id],201);
    }

    public function setTarget(Request $request)
    {
        $input = $request->validate([
            'period_jalali'=>['required','string','max:10'],
            'sales_target'=>['required','numeric','min:0'],
            'collection_target'=>['required','numeric','min:0'],
            'expense_target'=>['required','numeric','min:0'],
        ]);
        [$_start,$_end,$periodJalali]=PersianCalendar::month($input['period_jalali']);
        DB::table('financial_targets_jalali')->updateOrInsert(['period_jalali'=>$periodJalali], [
            'sales_target'=>$input['sales_target'],
            'collection_target'=>$input['collection_target'],
            'expense_target'=>$input['expense_target'],
            'updated_by'=>$request->user()->id,'updated_at'=>now(),
        ]);
        return response()->json(['message'=>'اهداف بودجه ثبت شد.']);
    }
}
