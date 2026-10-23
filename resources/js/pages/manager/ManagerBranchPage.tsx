import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Activity, ArrowRight, FileText, Upload, UsersRound } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import { errorMessage } from '../../lib/roles';
import { cardClass, ErrorNotice, PageTitle } from '../../components/management/Fields';
import type { Branch } from './ManagerBranchesPage';

type StaffSummary = { id:number;name:string;created_cases_count:number;import_batches_count:number;activities_count:number };
type BranchReport = { data:Branch;totals:{cases:number;imports:number;imported_rows:number;activities:number};employee_summary:StaffSummary[];recent_cases:{id:number;case_number?:string|null;owner_full_name:string;created_at:string}[];recent_activities:{id:number;action:string;description:string;created_at:string;user?:{name:string}|null}[] };
const format = (number:number)=>number.toLocaleString('fa-IR');

export default function ManagerBranchPage(){
  const {id}=useParams();const [report,setReport]=useState<BranchReport|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;api.get<BranchReport>(`/manager/branches/${id}`).then(({data})=>{if(active)setReport(data);}).catch(e=>{if(active)setError(errorMessage(e));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[id]);
  return <DashboardLayout>
    <PageTitle title={report?`شعبه ${report.data.name}`:'گزارش شعبه'} description="نمای تجمیعی پرونده‌ها، بارگذاری‌ها و فعالیت‌های کارمندان این شعبه."><Link to="/manager/branches" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm"><ArrowRight size={16}/> بازگشت به شعبه‌ها</Link></PageTitle>
    {loading&&<p className="text-sm text-slate-500">در حال دریافت گزارش شعبه...</p>}
    <ErrorNotice message={error}/>
    {report&&<div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        {label:'کل پرونده‌ها',value:report.totals.cases,Icon:FileText},
        {label:'دفعات بارگذاری اکسل',value:report.totals.imports,Icon:Upload},
        {label:'ردیف‌های موفق اکسل',value:report.totals.imported_rows,Icon:UsersRound},
        {label:'کل فعالیت‌ها',value:report.totals.activities,Icon:Activity},
      ].map(({label,value,Icon})=><div key={label} className="rounded-2xl border border-slate-200 bg-white p-5"><Icon size={21} className="mb-3 text-emerald-600"/><p className="text-xs text-slate-500">{label}</p><p className="mt-2 text-2xl font-black">{format(value)}</p></div>)}</div>
      <section className={cardClass}><h2 className="mb-5 text-lg font-black">عملکرد کارمندان فعلی و سابق این شعبه</h2><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-right text-sm"><thead className="border-b border-slate-100 text-slate-500"><tr>{['کارمند','پرونده‌های ثبت‌شده','فایل‌های اکسل','فعالیت‌ها'].map(x=><th className="px-3 py-3" key={x}>{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{report.employee_summary.map(e=><tr key={e.id}><td className="px-3 py-4 font-bold">{e.name}</td><td className="px-3 py-4">{format(e.created_cases_count)}</td><td className="px-3 py-4">{format(e.import_batches_count)}</td><td className="px-3 py-4">{format(e.activities_count)}</td></tr>)}</tbody></table>{report.employee_summary.length===0&&<p className="py-7 text-center text-sm text-slate-500">هنوز کارمندی در این شعبه نیست.</p>}</div></section>
      <div className="grid gap-6 xl:grid-cols-2">
        <section className={cardClass}><h2 className="mb-5 font-black">آخرین پرونده‌های شعبه</h2><div className="space-y-3">{report.recent_cases.map(c=><div key={c.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><strong>{c.owner_full_name}</strong><span dir="ltr" className="text-slate-500">{c.case_number||`#${c.id}`}</span></div>)}{report.recent_cases.length===0&&<p className="text-sm text-slate-500">پرونده‌ای ثبت نشده است.</p>}</div></section>
        <section className={cardClass}><h2 className="mb-5 font-black">آخرین فعالیت‌ها</h2><div className="space-y-3">{report.recent_activities.map(a=><div key={a.id} className="rounded-xl border border-slate-100 p-3 text-sm"><div className="font-semibold">{a.user?.name||'کاربر حذف‌شده'} · {a.action}</div><div className="mt-1 text-slate-600">{a.description}</div><time className="mt-2 block text-xs text-slate-400">{new Date(a.created_at).toLocaleString('fa-IR')}</time></div>)}{report.recent_activities.length===0&&<p className="text-sm text-slate-500">فعلا فعالیتی ثبت نشده است.</p>}</div></section>
      </div>
    </div>}
  </DashboardLayout>;
}
