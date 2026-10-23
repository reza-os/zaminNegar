import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ChangeEvent } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import { errorMessage } from '../../lib/roles';

type Batch = { id: number; original_file_name: string; status: string; total_rows: number; success_rows: number; failed_rows: number; created_at: string };

export default function ImportExcelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Batch | null>(null);
  const [history, setHistory] = useState<Batch[]>([]);
  const [historyPage,setHistoryPage] = useState(1);
  const [historyLastPage,setHistoryLastPage] = useState(1);
  const [fileQuery,setFileQuery] = useState('');
  const [fileSearch,setFileSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const loadHistory = useCallback(async () => {
    try { const {data} = await api.get<{data:Batch[];meta?:{last_page:number}}>('/imports',{params:{page:historyPage,search:fileSearch||undefined}}); setHistory(data.data);setHistoryLastPage(data.meta?.last_page||1); }
    catch(err) { setError(errorMessage(err)); }
  }, [historyPage,fileSearch]);
  useEffect(() => { void loadHistory(); }, [loadHistory]);

  async function deleteBatch(batch:Batch){
    if(!window.confirm(`تمام پرونده‌های ثبت‌شده توسط فایل «${batch.original_file_name}» حذف شوند؟ این عمل در فهرست‌ها برگشت‌پذیر نیست.`))return;
    setError('');
    try{await api.delete(`/imports/${batch.id}`);await loadHistory();}
    catch(err){setError(errorMessage(err));}
  }
  function pick(e: ChangeEvent<HTMLInputElement>) { setFile(e.target.files?.[0] || null); setResult(null); setError(''); }
  async function upload() {
    if (!file || loading) return;
    const form = new FormData(); form.append('file', file);
    setLoading(true); setError('');
    try {
      const { data } = await api.post<{import_batch: Batch}>('/imports', form);
      setResult(data.import_batch); setFile(null); await loadHistory();
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }

  return <DashboardLayout>
    <div className="space-y-6">
      <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-xl font-black text-slate-900">بارگذاری پرونده‌ها از اکسل</h1>
        <p className="mb-6 text-sm leading-7 text-slate-500">فایل‌های بارگذاری‌شده در سوابق خودتان ثبت می‌شوند و هر پرونده به شعبه فعلی شما تعلق می‌گیرد.</p>
        <div className="rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/30 p-6 text-center">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={pick} className="mx-auto block max-w-full text-sm" aria-label="انتخاب فایل اکسل" />
          {file && <p className="mt-4 text-sm text-slate-600">فایل انتخاب‌شده: {file.name}</p>}
          <button type="button" onClick={upload} disabled={!file||loading} className="mt-5 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50">{loading?'در حال پردازش...':'شروع بارگذاری'}</button>
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {result && <div className="mt-6 grid gap-4 md:grid-cols-3"><Box label="کل ردیف‌ها" value={result.total_rows}/><Box label="موفق" value={result.success_rows}/><Box label="خطادار" value={result.failed_rows}/></div>}
      </section>
      <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
        <h2 className="mb-5 text-lg font-black text-slate-900">تمام گروه‌های اکسل من</h2>
        <form onSubmit={e=>{e.preventDefault();setHistoryPage(1);setFileSearch(fileQuery.trim());}} className="mb-4 flex gap-2"><input aria-label="جست‌وجوی فایل اکسل" value={fileQuery} onChange={e=>setFileQuery(e.target.value)} placeholder="جست‌وجو در نام فایل" className="min-w-0 flex-1 rounded-xl border px-4 py-2 text-sm"/><button className="rounded-xl bg-emerald-700 px-4 py-2 text-sm text-white">جست‌وجو</button></form>
        {history.length===0?<p className="text-sm text-slate-500">هنوز فایلی بارگذاری نکرده‌اید.</p>:
          <div className="overflow-x-auto"><table className="w-full min-w-[550px] text-right text-sm"><thead className="border-b border-slate-100 text-slate-500"><tr>{['نام فایل','وضعیت','موفق','خطادار','تاریخ','عملیات'].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{history.map(batch=><tr key={batch.id}><td className="p-3 font-semibold">{batch.original_file_name}</td><td className="p-3">{batch.status}</td><td className="p-3">{batch.success_rows.toLocaleString('fa-IR')}</td><td className="p-3">{batch.failed_rows.toLocaleString('fa-IR')}</td><td className="p-3 text-slate-500">{new Date(batch.created_at).toLocaleDateString('fa-IR')}</td><td className="p-3"><div className="flex gap-2"><Link to={`/employee/imports/${batch.id}`} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">مشاهده گروه</Link><button type="button" onClick={()=>deleteBatch(batch)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">حذف گروه</button></div></td></tr>)}</tbody></table></div>}
        <div className="mt-5 flex items-center justify-center gap-4 text-sm"><button type="button" disabled={historyPage<=1} onClick={()=>setHistoryPage(p=>p-1)} className="rounded-lg border px-3 py-2 disabled:opacity-30">قبلی</button><span>{historyPage.toLocaleString('fa-IR')} از {historyLastPage.toLocaleString('fa-IR')}</span><button type="button" disabled={historyPage>=historyLastPage} onClick={()=>setHistoryPage(p=>p+1)} className="rounded-lg border px-3 py-2 disabled:opacity-30">بعدی</button></div>
      </section>
    </div>
  </DashboardLayout>;
}
function Box({label,value}:{label:string;value:number}){return <div className="rounded-xl bg-slate-50 p-4 text-center"><p className="text-xs text-slate-500">{label}</p><strong className="mt-2 block text-xl">{value.toLocaleString('fa-IR')}</strong></div>}
