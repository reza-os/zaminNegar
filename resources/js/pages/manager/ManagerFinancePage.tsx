import { FormEvent, useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Building2, ChartNoAxesCombined, CircleDollarSign, FileText, Landmark, Target } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import { errorMessage } from '../../lib/roles';

type Overview={
  period:string;
  contracts:{total:number;received:number;remaining:number;collection_percent:number|null;monthly_sales:number;monthly_collections:number;sales_by_employee:{employee_id:number;name:string;sales_amount:number;case_count:number}[]};
  invoices:{count:number;total:number|null;average:number|null;received:number|null;remaining:number|null;collection_percent:number|null;due_count:number|null;due_amount:number|null;overdue_count:number|null;overdue_amount:number|null;monthly_total:number;monthly_received:number};
  expenses:{total:number;direct:number;fixed:number;monthly:number;categories:{category:string;total:number}[]};
  estimated_profit:{gross:number;net:number;note:string};
  budget:{sales_target:number|null;collection_target:number|null;expense_target:number|null;sales_actual:number;collection_actual:number;expense_actual:number;sales_percent:number|null;collection_percent:number|null};
  meta:{unit:string;warning:string};
};
type Branch={id:number;name:string};
const asciiDigits=(v:string)=>v.replace(/[۰-۹]/g,d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
const today=asciiDigits(new Intl.DateTimeFormat('fa-IR-u-ca-persian',{year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()));
const onlyPositive=(v:string)=>asciiDigits(v).replace(/[^0-9.]/g,'');
const detailedError=(err:any):string=>{
  const errors=err?.response?.data?.errors;
  const first=errors && Object.values(errors).flat().find(x=>typeof x==='string');
  return typeof first==='string'?first:errorMessage(err);
};
const number=(n:number|null|undefined)=>n==null?'—':new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(n);
const money=(n:number|null|undefined)=>n==null?'ثبت نشده':number(n);
const panel='rounded-[1.5rem] border-[3px] border-slate-950 bg-white p-5 shadow-[6px_6px_0_0_#0f172a] sm:p-6';
const input='min-w-0 w-full rounded-xl border-2 border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-amber-500';
function Metric({label,value,color='bg-white',hint}:{label:string;value:string;color?:string;hint?:string}){
  return <article className={`${panel} ${color}`}><p className="text-xs font-bold text-slate-700">{label}</p><p dir="ltr" className="mt-4 break-words text-right text-xl font-black sm:text-2xl">{value}</p>{hint&&<p className="mt-2 text-xs leading-6 text-slate-600">{hint}</p>}</article>;
}
export default function ManagerFinancePage(){
  const [period,setPeriod]=useState(()=>today.slice(0,7));const [appliedPeriod,setAppliedPeriod]=useState(()=>today.slice(0,7));const [branch,setBranch]=useState('');const [branches,setBranches]=useState<Branch[]>([]);
  const [data,setData]=useState<Overview|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);const [refresh,setRefresh]=useState(0);
  const [saving,setSaving]=useState(false);
  const [invoice,setInvoice]=useState({case_id:'',case_number:'',number:'',issued_at_jalali:today,due_at_jalali:'',amount:'',paid_amount:'0'});
  const [caseOptions,setCaseOptions]=useState<{id:number;case_number:string;owner_full_name:string}[]>([]);
  const [expenseFile,setExpenseFile]=useState<File|null>(null);
  const [importingExpenses,setImportingExpenses]=useState(false);
  const [importSuccess,setImportSuccess]=useState('');
  const [expense,setExpense]=useState({branch_id:'',category:'',type:'direct',description:'',amount:'',spent_at_jalali:today});
  const [budget,setBudget]=useState({sales_target:'0',collection_target:'0',expense_target:'0'});
  const reload=useCallback(()=>setRefresh(v=>v+1),[]);
  useEffect(()=>{api.get('/manager/branches',{params:{per_page:100}}).then(({data})=>setBranches(Array.isArray(data?.data)?data.data:Array.isArray(data)?data:[])).catch(()=>{});},[]);
  useEffect(()=>{let active=true;setLoading(true);setError('');api.get<Overview>('/manager/finance',{params:{period_jalali:appliedPeriod,branch_id:branch||undefined}}).then(({data:r})=>{if(active){setData(r);if(!branch)setBudget({sales_target:String(r.budget.sales_target??0),collection_target:String(r.budget.collection_target??0),expense_target:String(r.budget.expense_target??0)})}}).catch(err=>active&&setError(errorMessage(err))).finally(()=>active&&setLoading(false));return()=>{active=false};},[appliedPeriod,branch,refresh]);
  useEffect(()=>{
    if(invoice.case_number.trim().length<2){setCaseOptions([]);return;}
    let active=true;
    const timer=window.setTimeout(()=>api.get('/manager/finance/case-options',{params:{search:invoice.case_number}})
      .then(({data})=>{if(active)setCaseOptions(data.data||[])}).catch(()=>{if(active)setCaseOptions([])}),350);
    return()=>{active=false;window.clearTimeout(timer)};
  },[invoice.case_number]);
  async function uploadExpenses(){
    if(!expenseFile || importingExpenses)return;
    setImportingExpenses(true);setError('');setImportSuccess('');
    const payload=new FormData();payload.append('file',expenseFile);
    try{
      const {data}=await api.post('/manager/finance/expenses/import',payload);
      setImportSuccess(`${Number(data.imported_rows).toLocaleString('fa-IR')} هزینه با موفقیت وارد شد.`);
      setExpenseFile(null);reload();
    }catch(err){setError(detailedError(err))}finally{setImportingExpenses(false)}
  }
  async function downloadTemplate(){
    try{const {data}=await api.get('/manager/finance/expenses/template',{responseType:'blob'});
      const href=URL.createObjectURL(data as Blob);const a=document.createElement('a');a.href=href;a.download='zaminnegar-expenses-template.xlsx';a.click();URL.revokeObjectURL(href);
    }catch(err){setError(detailedError(err))}
  }
  function applyPeriod(){
    if(!/^1[34][0-9]{2}\/(0[1-9]|1[0-2])$/.test(period)) {
      setError('ماه شمسی را به شکل ۱۴۰۵/۰۷ وارد کنید.');return;
    }
    setError('');setAppliedPeriod(period);reload();
  }
  async function submit(url:string,method:'post'|'put',payload:object,after?:()=>void){setSaving(true);setError('');try{await api[method](url,payload);after?.();reload();}catch(err){setError(detailedError(err));}finally{setSaving(false)}}
  const saveInvoice=(e:FormEvent)=>{e.preventDefault();void submit('/manager/finance/invoices','post',{...invoice,case_id:invoice.case_id?Number(invoice.case_id):null,amount:Number(invoice.amount),paid_amount:Number(invoice.paid_amount),due_at_jalali:invoice.due_at_jalali||null},()=>setInvoice({case_id:'',case_number:'',number:'',issued_at_jalali:today,due_at_jalali:'',amount:'',paid_amount:'0'}))};
  const saveExpense=(e:FormEvent)=>{e.preventDefault();void submit('/manager/finance/expenses','post',{...expense,branch_id:expense.branch_id?Number(expense.branch_id):null,amount:Number(expense.amount)},()=>setExpense({branch_id:'',category:'',type:'direct',description:'',amount:'',spent_at_jalali:today}))};
  const saveBudget=(e:FormEvent)=>{e.preventDefault();void submit('/manager/finance/targets','put',{period_jalali:appliedPeriod,...Object.fromEntries(Object.entries(budget).map(([k,v])=>[k,Number(v)]))})};
  const b=data?.budget;const c=data?.contracts;const i=data?.invoices;const x=data?.expenses;
  return <DashboardLayout><div dir="rtl" className="min-w-0 space-y-8 bg-amber-50/30 pb-10 text-slate-950">
    <header className="border-b-4 border-slate-950 pb-6"><div className="mb-3 inline-flex items-center gap-2 border-2 border-black bg-amber-300 px-3 py-1 text-xs font-black"><ChartNoAxesCombined size={17}/> مدیریت مالی زمین‌نگار</div><h1 className="text-3xl font-black">داشبورد مالی منیجر</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">اطلاعات قراردادها و مبالغ دریافتی از پرونده‌ها خوانده می‌شود؛ فاکتور، هزینه و بودجه به‌صورت جداگانه قابل ثبت هستند.</p></header>
    <div className={`${panel} flex flex-col gap-4 sm:flex-row sm:items-end`}><label className="flex-1 text-sm font-bold">ماه گزارش (شمسی، مثال ۱۴۰۵/۰۷)<input className={`${input} mt-2`} type="text" inputMode="numeric" maxLength={7} value={period} onChange={e=>setPeriod(asciiDigits(e.target.value))}/></label><label className="flex-1 text-sm font-bold">شعبه<select className={`${input} mt-2`} value={branch} onChange={e=>setBranch(e.target.value)}><option value="">کل شرکت</option>{branches.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></label><button onClick={applyPeriod} className="rounded-xl border-2 border-black bg-amber-300 px-5 py-3 text-sm font-black">به‌روزرسانی</button></div>
    {error&&<p role="alert" className="border-2 border-red-600 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {importSuccess&&<p role="status" className="border-2 border-green-600 bg-green-50 p-4 text-sm font-semibold text-green-900">{importSuccess}</p>}
    {loading&&<p role="status" className="p-8 text-center text-sm">در حال دریافت آمار...</p>}
    {data&&<>
      <p className="border-r-4 border-amber-500 bg-amber-100 p-4 text-xs leading-7">{data.meta.warning} — {data.meta.unit}</p>
      <section className="space-y-4"><h2 className="flex items-center gap-2 text-xl font-black"><Landmark size={22}/> فروش و مبالغ قراردادی</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="مجموع مبلغ قراردادها" value={money(c?.total)} color="bg-amber-200"/><Metric label="مجموع وصول از پرونده‌ها" value={money(c?.received)} color="bg-green-200"/><Metric label="مانده قابل دریافت از پرونده‌ها" value={money(c?.remaining)} color="bg-rose-100"/><Metric label="درصد وصول مبالغ قرارداد" value={c?.collection_percent==null?'—':`${number(c.collection_percent)}٪`}/></div></section>
      <section className="space-y-4"><h2 className="flex items-center gap-2 text-xl font-black"><FileText size={22}/> فاکتورهای ثبت‌شده</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="مجموع مبالغ فاکتورها" value={money(i?.total)} color="bg-blue-100"/><Metric label="تعداد فاکتورها" value={number(i?.count)}/><Metric label="میانگین مبلغ فاکتور" value={money(i?.average)}/><Metric label="مطالبات سررسیدشده" value={money(i?.due_amount)} hint={`${number(i?.due_count)} فاکتور سررسیدشده`}/><Metric label="مطالبات معوق (گذشته از سررسید)" value={money(i?.overdue_amount)} hint={`${number(i?.overdue_count)} فاکتور دارای مانده و تاریخ گذشته`}/><Metric label="مبلغ وصول‌شده از فاکتورها" value={money(i?.received)}/><Metric label="مانده فاکتورها" value={money(i?.remaining)}/><Metric label="درصد وصول فاکتور" value={i?.collection_percent==null?'—':`${number(i.collection_percent)}٪`}/></div><p className="text-xs leading-7 text-slate-600">مطالبات سررسیدشده شامل فاکتورهای موعد امروز و پیش از امروز است؛ مطالبات معوق فقط موعدهای گذشته را شامل می‌شود. اکسل تاریخ سررسید مالی ندارد.</p></section>
      <section className="space-y-4"><h2 className="flex items-center gap-2 text-xl font-black"><CircleDollarSign size={22}/> هزینه و سود برآوردی</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="هزینه کل ثبت‌شده" value={money(x?.total)} color="bg-orange-100"/><Metric label="هزینه مستقیم" value={money(x?.direct)}/><Metric label="هزینه ثابت" value={money(x?.fixed)}/><Metric label="سود ناخالص برآوردی" value={money(data.estimated_profit.gross)} color="bg-green-100"/><Metric label="سود خالص برآوردی" value={money(data.estimated_profit.net)} color="bg-yellow-100"/></div><p className="border-r-4 border-rose-400 bg-rose-50 px-4 py-3 text-xs leading-7">{data.estimated_profit.note}</p><div className={panel}><h3 className="mb-4 text-base font-black">هزینه بر اساس دسته‌بندی</h3><div className="space-y-3">{x?.categories.map(cat=><div key={cat.category} className="flex items-center justify-between gap-4 border-b border-slate-100 py-2 text-sm"><span>{cat.category}</span><b>{money(cat.total)}</b></div>)}{x?.categories.length===0&&<p className="text-sm text-slate-500">هنوز هزینه‌ای ثبت نشده است.</p>}</div></div></section>
      <section className="space-y-4"><h2 className="flex items-center gap-2 text-xl font-black"><Target size={22}/> بودجه و مقایسه عملکرد ماهانه</h2><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"><Metric label="هدف فروش ماهانه" value={money(b?.sales_target)}/><Metric label="فروش واقعی طبق پرونده‌های ثبت‌شده این ماه" value={money(b?.sales_actual)} color="bg-amber-100"/><Metric label="درصد تحقق هدف فروش" value={b?.sales_percent==null?'—':`${number(b.sales_percent)}٪`}/><Metric label="هدف وصول ماهانه" value={money(b?.collection_target)}/><Metric label="وصول منسوب به پرونده‌های ثبت‌شده این ماه" value={money(b?.collection_actual)} color="bg-green-100"/><Metric label="درصد تحقق هدف وصول" value={b?.collection_percent==null?'—':`${number(b.collection_percent)}٪`}/><Metric label="هدف هزینه" value={money(b?.expense_target)}/><Metric label="هزینه واقعی ماهانه" value={money(b?.expense_actual)} color="bg-rose-100"/></div><p className="text-xs leading-7 text-slate-600">زمان مبالغ قرارداد و وصول اکسل، زمان وقوع واقعی تراکنش نیست. گزارش ماهانه با تاریخ ثبت پرونده در سامانه سنجیده می‌شود.</p></section>
      <section className={panel}><h2 className="mb-5 text-lg font-black">فروش قراردادی هر کارمند</h2><div className="max-h-80 space-y-2 overflow-y-auto pr-2">{c?.sales_by_employee.map((u,idx)=><div key={u.employee_id} className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-3 text-sm"><span>{idx+1}. {u.name} <small className="text-slate-500">({number(u.case_count)} پرونده)</small></span><strong>{money(u.sales_amount)}</strong></div>)}{c?.sales_by_employee.length===0&&<p className="text-sm text-slate-500">داده‌ای برای نمایش وجود ندارد.</p>}</div></section>
    </>}
    <section className="grid gap-6 xl:grid-cols-2">
      <form onSubmit={saveInvoice} className={`${panel} space-y-4`}><h2 className="flex items-center gap-2 text-lg font-black"><FileText size={21}/> ثبت فاکتور واقعی</h2><p className="text-xs leading-6 text-slate-500">فاکتور مستقل از مبلغ قرارداد پرونده است و دوباره به مجموع قراردادها اضافه نمی‌شود.</p><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">جست‌وجو و انتخاب پرونده فعال<input required className={`${input} mt-2`} value={invoice.case_number} onChange={e=>setInvoice(p=>({...p,case_number:e.target.value,case_id:''}))} placeholder="نام مالک یا شماره پرونده"/>{caseOptions.length>0&&<select size={Math.min(5,caseOptions.length)} aria-label="انتخاب پرونده" className={`${input} mt-2`} value={invoice.case_id} onChange={e=>{const c=caseOptions.find(x=>String(x.id)===e.target.value);if(c)setInvoice(p=>({...p,case_id:String(c.id),case_number:c.case_number}))}}><option value="">پرونده را انتخاب کنید</option>{caseOptions.map(c=><option key={c.id} value={c.id}>{c.owner_full_name} — {c.case_number}</option>)}</select>}<small className="mt-1 block text-[11px] text-slate-600">{invoice.case_id?'پرونده معتبر انتخاب شده است.':'پرونده را از نتایج انتخاب کن؛ فقط پرونده‌های فعال قابل صدور فاکتورند.'}</small></label><label className="text-xs font-bold">شماره فاکتور<input required className={`${input} mt-2`} value={invoice.number} onChange={e=>setInvoice(p=>({...p,number:e.target.value}))}/></label><label className="text-xs font-bold">تاریخ صدور (شمسی)<input required type="text" inputMode="numeric" placeholder="۱۴۰۵/۰۷/۰۱" className={`${input} mt-2`} value={invoice.issued_at_jalali} onChange={e=>setInvoice(p=>({...p,issued_at_jalali:asciiDigits(e.target.value)}))}/></label><label className="text-xs font-bold">سررسید (شمسی)<input type="text" inputMode="numeric" placeholder="۱۴۰۵/۰۷/۱۵" className={`${input} mt-2`} value={invoice.due_at_jalali} onChange={e=>setInvoice(p=>({...p,due_at_jalali:asciiDigits(e.target.value)}))}/></label><label className="text-xs font-bold">مبلغ کل<input type="number" step="0.01" min="0.01" required className={`${input} mt-2`} value={invoice.amount} onChange={e=>setInvoice(p=>({...p,amount:onlyPositive(e.target.value)}))}/></label><label className="text-xs font-bold">مبلغ وصول‌شده<input type="number" step="0.01" min="0" required className={`${input} mt-2`} value={invoice.paid_amount} onChange={e=>setInvoice(p=>({...p,paid_amount:onlyPositive(e.target.value)}))}/></label></div><button disabled={saving} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">ثبت فاکتور</button></form>
      <form onSubmit={saveExpense} className={`${panel} space-y-4`}><h2 className="flex items-center gap-2 text-lg font-black"><ArrowLeftRight size={21}/> ثبت هزینه واقعی</h2><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold">دسته هزینه<input required className={`${input} mt-2`} value={expense.category} onChange={e=>setExpense(p=>({...p,category:e.target.value}))} placeholder="مثلاً رفت‌وآمد"/></label><label className="text-xs font-bold">نوع هزینه<select className={`${input} mt-2`} value={expense.type} onChange={e=>setExpense(p=>({...p,type:e.target.value}))}><option value="direct">مستقیم</option><option value="fixed">ثابت</option></select></label><label className="text-xs font-bold">شعبه<select className={`${input} mt-2`} value={expense.branch_id} onChange={e=>setExpense(p=>({...p,branch_id:e.target.value}))}><option value="">عمومی شرکت</option>{branches.map(z=><option key={z.id} value={z.id}>{z.name}</option>)}</select></label><label className="text-xs font-bold">تاریخ هزینه (شمسی)<input type="text" inputMode="numeric" placeholder="۱۴۰۵/۰۷/۰۱" required className={`${input} mt-2`} value={expense.spent_at_jalali} onChange={e=>setExpense(p=>({...p,spent_at_jalali:asciiDigits(e.target.value)}))}/></label><label className="text-xs font-bold">مبلغ<input type="number" step="0.01" min="0.01" required className={`${input} mt-2`} value={expense.amount} onChange={e=>setExpense(p=>({...p,amount:onlyPositive(e.target.value)}))}/></label><label className="text-xs font-bold">توضیح<input className={`${input} mt-2`} value={expense.description} onChange={e=>setExpense(p=>({...p,description:e.target.value}))}/></label></div><button disabled={saving} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">ثبت هزینه</button></form>
    </section>
    <section className={`${panel} space-y-4`}>
      <h2 className="text-lg font-black">ورود گروهی هزینه‌ها از فایل اکسل</h2>
      <p className="text-sm leading-7 text-slate-600">قالب استاندارد شامل شناسه هزینه، دسته، نوع، تاریخ شمسی، مبلغ، کد شعبه و توضیحات است. فایل تکراری و شناسه هزینه تکراری، دوباره ثبت نمی‌شود.</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center"><button type="button" onClick={downloadTemplate} className="rounded-xl border-2 border-black px-4 py-3 text-sm font-bold">دانلود قالب هزینه‌ها</button><input aria-label="انتخاب اکسل هزینه‌ها" type="file" accept=".xlsx,.xls" onChange={e=>setExpenseFile(e.target.files?.[0]||null)} className="min-w-0 flex-1 text-sm"/><button type="button" disabled={!expenseFile||importingExpenses} onClick={uploadExpenses} className="rounded-xl bg-amber-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{importingExpenses?'در حال ثبت...':'بارگذاری هزینه‌ها'}</button></div>
    </section>
    <form onSubmit={saveBudget} className={`${panel} space-y-4`}><h2 className="flex items-center gap-2 text-lg font-black"><Building2 size={21}/> اهداف ماهانه کل شرکت — {appliedPeriod.replace('-', '/')}</h2><p className="text-xs text-slate-600">هدف مشترک شرکت است؛ برای ویرایش آن حالت «کل شرکت» را انتخاب کنید.</p><div className="grid gap-4 sm:grid-cols-3">{(['sales_target','collection_target','expense_target'] as const).map((key,idx)=><label key={key} className="text-sm font-bold">{['هدف فروش','هدف وصول','هدف هزینه'][idx]}<input type="number" step="0.01" min="0" required disabled={Boolean(branch)} className={`${input} mt-2`} value={budget[key]} onChange={e=>setBudget(p=>({...p,[key]:onlyPositive(e.target.value)}))}/></label>)}</div><button disabled={Boolean(branch)||saving} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">ذخیره اهداف</button></form>
  </div></DashboardLayout>;
}
