import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ChangeEvent, FormEvent } from 'react';
import { FileSpreadsheet, Loader2, Search, Trash2, UploadCloud } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import { errorMessage } from '../../lib/roles';
import './employee-warm.css';

type Batch = { id: number; original_file_name: string; status: string; total_rows: number; success_rows: number; failed_rows: number; created_at: string };

export default function ImportExcelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Batch | null>(null);
  const [history, setHistory] = useState<Batch[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLastPage, setHistoryLastPage] = useState(1);
  const [fileQuery, setFileQuery] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: Batch[]; meta?: { last_page: number } }>('/imports', { params: { page: historyPage, search: fileSearch || undefined } });
      setHistory(data.data); setHistoryLastPage(data.meta?.last_page || 1);
    } catch (err) { setError(errorMessage(err)); }
  }, [historyPage, fileSearch]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  async function deleteBatch(batch: Batch) {
    if (!window.confirm(`تمام پرونده‌های ثبت‌شده توسط فایل «${batch.original_file_name}» حذف شوند؟ این عمل در فهرست‌ها برگشت‌پذیر نیست.`)) return;
    setError('');
    try { await api.delete(`/imports/${batch.id}`); await loadHistory(); }
    catch (err) { setError(errorMessage(err)); }
  }

  function pick(e: ChangeEvent<HTMLInputElement>) { setFile(e.target.files?.[0] || null); setResult(null); setError(''); }

  async function upload() {
    if (!file || loading) return;
    const form = new FormData(); form.append('file', file);
    setLoading(true); setError('');
    try {
      const { data } = await api.post<{ import_batch: Batch }>('/imports', form);
      setResult(data.import_batch); setFile(null); await loadHistory();
    } catch (err) { setError(errorMessage(err)); }
    finally { setLoading(false); }
  }

  const onSearch = (e: FormEvent) => { e.preventDefault(); setHistoryPage(1); setFileSearch(fileQuery.trim()); };

  return <DashboardLayout>
    <div className="employee-warm-page space-y-6" dir="rtl">
      <section className="employee-hero">
        <div className="employee-badge-soft mb-3">اکسل و ورود گروهی</div>
        <h1 className="text-2xl font-black text-[var(--ew-text)]">بارگذاری پرونده‌ها از اکسل</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--ew-muted)]">فایل‌های بارگذاری‌شده در سوابق خودتان ثبت می‌شوند و هر پرونده به شعبه فعلی شما تعلق می‌گیرد. هر گروه را بعداً می‌توانید جداگانه مشاهده و یکجا حذف کنید.</p>
      </section>

      <section className="employee-panel">
        <div className="rounded-[1.6rem] border border-dashed border-[#e6bd90] bg-white/60 p-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#fff0de] text-[#b75a39]"><UploadCloud size={28} /></div>
          <input type="file" accept=".xlsx,.xls,.csv" onChange={pick} className="mx-auto mt-5 block max-w-full text-sm" aria-label="انتخاب فایل اکسل" />
          {file && <p className="mt-4 text-sm font-semibold text-[var(--ew-text)]">فایل انتخاب‌شده: {file.name}</p>}
          <button type="button" onClick={upload} disabled={!file || loading} className="employee-button mt-5">{loading ? <><Loader2 className="animate-spin" size={16}/> در حال پردازش...</> : 'شروع بارگذاری'}</button>
        </div>
        {error && <p role="alert" className="employee-alert mt-4">{error}</p>}
        {result && <div className="employee-grid-3 mt-6"><Box label="کل ردیف‌ها" value={result.total_rows}/><Box label="موفق" value={result.success_rows}/><Box label="خطادار" value={result.failed_rows}/></div>}
      </section>

      <section className="employee-list-card">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-black text-[var(--ew-text)]">تمام گروه‌های اکسل من</h2>
            <p className="mt-1 text-sm text-[var(--ew-muted)]">فایل‌های قبلی خودتان را جست‌وجو کنید و پرونده‌های هر گروه را ببینید.</p>
          </div>
          <div className="employee-badge-soft"><FileSpreadsheet size={15} /> {history.length.toLocaleString('fa-IR')} فایل در این صفحه</div>
        </div>
        <form onSubmit={onSearch} className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1"><Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--ew-muted)]"/><input aria-label="جست‌وجوی فایل اکسل" value={fileQuery} onChange={e=>setFileQuery(e.target.value)} placeholder="جست‌وجو در نام فایل" className="employee-input pr-11"/></div>
          <button className="employee-secondary-button">جست‌وجو</button>
        </form>
        {history.length===0 ? <p className="text-sm text-[var(--ew-muted)]">هنوز فایلی بارگذاری نکرده‌اید.</p> :
          <div className="employee-scroll overflow-x-auto"><table className="employee-table min-w-[760px]"><thead><tr>{['نام فایل','وضعیت','موفق','خطادار','تاریخ','عملیات'].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead><tbody>{history.map(batch=><tr key={batch.id}><td className="p-3 font-black text-[var(--ew-text)]">{batch.original_file_name}</td><td className="p-3">{batch.status}</td><td className="p-3">{batch.success_rows.toLocaleString('fa-IR')}</td><td className="p-3">{batch.failed_rows.toLocaleString('fa-IR')}</td><td className="p-3">{new Date(batch.created_at).toLocaleDateString('fa-IR')}</td><td className="p-3"><div className="flex flex-wrap gap-2"><Link to={`/employee/imports/${batch.id}`} className="employee-soft-button !px-3 !py-2 !text-xs">مشاهده گروه</Link><button type="button" onClick={()=>deleteBatch(batch)} className="employee-danger-button !px-3 !py-2 !text-xs"><Trash2 size={14}/> حذف گروه</button></div></td></tr>)}</tbody></table></div>}
        <div className="mt-5 flex items-center justify-center gap-4 text-sm"><button type="button" disabled={historyPage<=1} onClick={()=>setHistoryPage(p=>p-1)} className="employee-soft-button !px-4 !py-2 disabled:opacity-30">قبلی</button><span>{historyPage.toLocaleString('fa-IR')} از {historyLastPage.toLocaleString('fa-IR')}</span><button type="button" disabled={historyPage>=historyLastPage} onClick={()=>setHistoryPage(p=>p+1)} className="employee-soft-button !px-4 !py-2 disabled:opacity-30">بعدی</button></div>
      </section>
    </div>
  </DashboardLayout>;
}

function Box({label,value}:{label:string;value:number}){return <div className="employee-stat-card text-center"><p className="text-xs font-bold text-[var(--ew-muted)]">{label}</p><strong className="mt-2 block text-2xl font-black text-[var(--ew-text)]">{value.toLocaleString('fa-IR')}</strong></div>}
