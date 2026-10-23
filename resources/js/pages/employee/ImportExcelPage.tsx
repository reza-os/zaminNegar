import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import type { ChangeEvent, FormEvent } from 'react';
import { AlertTriangle, Download, FileSpreadsheet, Loader2, RotateCcw, Search, Trash2, UploadCloud } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import { errorMessage, cachedUser } from '../../lib/roles';
import './employee-warm.css';

type Batch = {
  id: number;
  user_id: number;
  user?: { name: string; deleted_at?: string | null } | null;
  original_file_name: string;
  status: string;
  total_rows: number;
  success_rows: number;
  failed_rows: number;
  created_at: string;
};
type DuplicateFile = {
  code: 'duplicate_file';
  message: string;
  existing_batch: Pick<Batch, 'id' | 'user_id' | 'original_file_name' | 'success_rows' | 'failed_rows' | 'status'>;
  can_retry_failed: boolean;
  can_confirm_duplicate: boolean;
};

const fa = (value: number) => value.toLocaleString('fa-IR');
const displayStatus = (batch: Batch) => batch.status === 'completed'
  ? (batch.failed_rows ? 'پایان پردازش با خطا' : 'پایان پردازش موفق')
  : batch.status === 'processing' ? 'در حال پردازش'
  : batch.status === 'failed' ? 'پردازش ناتمام' : batch.status;

export default function ImportExcelPage() {
  const ownId = cachedUser()?.id;
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Batch | null>(null);
  const [duplicate, setDuplicate] = useState<DuplicateFile | null>(null);
  const [history, setHistory] = useState<Batch[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLastPage, setHistoryLastPage] = useState(1);
  const [fileQuery, setFileQuery] = useState('');
  const [fileSearch, setFileSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<number | null>(null);
  const [reportingId, setReportingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const loadHistory = useCallback(async () => {
    try {
      const { data } = await api.get<{ data: Batch[]; meta?: { last_page: number } }>(
        '/imports', { params: { page: historyPage, search: fileSearch || undefined } },
      );
      setHistory(data.data);
      setHistoryLastPage(data.meta?.last_page || 1);
    } catch (err) { setError(errorMessage(err)); }
  }, [historyPage, fileSearch]);

  useEffect(() => { void loadHistory(); }, [loadHistory]);

  function pick(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] || null);
    setDuplicate(null);
    setResult(null);
    setNotice('');
    setError('');
  }

  async function upload(confirmDuplicate = false) {
    if (!file || loading) return;
    const form = new FormData();
    form.append('file', file);
    if (confirmDuplicate) form.append('confirm_duplicate', '1');
    setLoading(true); setError(''); setNotice('');
    try {
      const { data } = await api.post<{ import_batch: Batch; message: string }>('/imports', form);
      setResult(data.import_batch);
      setNotice(data.message);
      setDuplicate(null);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setHistoryPage(1);
      await loadHistory();
    } catch (err: any) {
      if (err?.response?.status === 409 && err?.response?.data?.code === 'duplicate_file') {
        setDuplicate(err.response.data as DuplicateFile);
      } else {
        setError(errorMessage(err));
      }
    } finally { setLoading(false); }
  }

  async function retryFailed(batch: Batch) {
    if (ownId !== batch.user_id) return;
    if (!window.confirm(`فقط ${fa(batch.failed_rows)} ردیف خطادار فایل «${batch.original_file_name}» دوباره بررسی شوند؟ پرونده‌های موفق قبلی تغییر نمی‌کنند.`)) return;
    setRetryingId(batch.id); setError(''); setNotice('');
    try {
      const { data } = await api.post<{ import_batch: Batch; message: string }>(`/imports/${batch.id}/retry-failed`);
      setNotice(data.message);
      setResult(data.import_batch);
      setDuplicate(null);
      await loadHistory();
    } catch (err) { setError(errorMessage(err)); }
    finally { setRetryingId(null); }
  }

  async function downloadErrorReport(batchId: number) {
    setReportingId(batchId); setError('');
    try {
      const { data } = await api.get<Blob>(`/imports/${batchId}/error-report`, { responseType: 'blob' });
      const url = URL.createObjectURL(data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `import-errors-${batchId}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (err) { setError(errorMessage(err)); }
    finally { setReportingId(null); }
  }

  async function deleteBatch(batch: Batch) {
    if (!window.confirm(`تمام پرونده‌های ثبت‌شده توسط فایل «${batch.original_file_name}» حذف شوند؟ این عمل در فهرست‌ها برگشت‌پذیر نیست.`)) return;
    setError('');
    try { await api.delete(`/imports/${batch.id}`); await loadHistory(); }
    catch (err) { setError(errorMessage(err)); }
  }

  const onSearch = (e: FormEvent) => {
    e.preventDefault(); setHistoryPage(1); setFileSearch(fileQuery.trim());
  };

  return <DashboardLayout>
    <div className="employee-warm-page space-y-6" dir="rtl">
      <section className="employee-hero">
        <div className="employee-badge-soft mb-3">اکسل و ورود گروهی</div>
        <h1 className="text-2xl font-black text-[var(--ew-text)]">بارگذاری هوشمند پرونده‌ها از اکسل</h1>
        <p className="mt-2 max-w-3xl text-sm leading-7 text-[var(--ew-muted)]">
          فایل تکراری قبل از پردازش شناسایی می‌شود؛ فقط با تأیید شما دوباره پردازش خواهد شد.
          برای گروه‌های قبلی می‌توانید فقط ردیف‌های ناموفق را مجدداً بررسی یا گزارش خطاهایشان را دانلود کنید.
        </p>
      </section>

      <section className="employee-panel">
        <div className="rounded-[1.6rem] border border-dashed border-[#e6bd90] bg-white/60 p-6 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#fff0de] text-[#b75a39]"><UploadCloud size={28} /></div>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={pick}
            className="mx-auto mt-5 block max-w-full text-sm" aria-label="انتخاب فایل اکسل" />
          {file && <p className="mt-4 text-sm font-semibold">فایل انتخاب‌شده: {file.name}</p>}
          <button type="button" onClick={() => void upload(false)} disabled={!file || loading} className="employee-button mt-5">
            {loading ? <><Loader2 className="animate-spin" size={16}/> در حال پردازش...</> : 'شروع بارگذاری'}
          </button>
        </div>

        {duplicate && <div role="alert" className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 text-amber-950">
          <div className="mb-2 flex items-center gap-2 font-black"><AlertTriangle size={20} /> فایل تکراری شناسایی شد</div>
          <p className="text-sm leading-7">{duplicate.message}</p>
          <p className="mt-1 text-xs">گروه #{duplicate.existing_batch.id} · موفق: {fa(duplicate.existing_batch.success_rows)} · خطادار: {fa(duplicate.existing_batch.failed_rows)}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {duplicate.can_retry_failed && <button type="button"
              onClick={() => void retryFailed(duplicate.existing_batch as Batch)}
              disabled={retryingId !== null}
              className="employee-button !py-2 !text-xs"><RotateCcw size={15} /> فقط تلاش مجدد خطاهای گروه قبلی</button>}
            {duplicate.can_confirm_duplicate && <button type="button" onClick={() => void upload(true)}
              disabled={loading || retryingId !== null} className="employee-soft-button !py-2 !text-xs">با آگاهی از تکراری‌بودن، پردازش دوباره فایل</button>}
            <button type="button" className="employee-soft-button !py-2 !text-xs" onClick={() => setDuplicate(null)}>انصراف</button>
          </div>
          <p className="mt-3 text-xs leading-6">تأیید پردازش دوباره، پرونده‌های تکراری را بازنویسی نمی‌کند. معمولاً گزینه «فقط تلاش مجدد خطاها» مناسب‌تر است.</p>
        </div>}

        {error && <p role="alert" className="employee-alert mt-4">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-950">{notice}</p>}
        {result && <div className="employee-grid-3 mt-6"><Box label="کل ردیف‌ها" value={result.total_rows}/><Box label="موفق" value={result.success_rows}/><Box label="خطادار" value={result.failed_rows}/></div>}
        {result && result.failed_rows > 0 && <button type="button" onClick={() => void downloadErrorReport(result.id)}
          disabled={reportingId === result.id} className="employee-soft-button mt-4"><Download size={16}/> دانلود گزارش خطاهای گروه جدید</button>}
      </section>

      <section className="employee-list-card">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h2 className="text-lg font-black text-[var(--ew-text)]">گروه‌های اکسل من</h2>
            <p className="mt-1 text-sm text-[var(--ew-muted)]">«پایان پردازش» به معنی موفقیت همه ردیف‌ها نیست؛ تعداد خطاها را بررسی کنید.</p></div>
          <div className="employee-badge-soft"><FileSpreadsheet size={15} /> {fa(history.length)} فایل در این صفحه</div>
        </div>
        <form onSubmit={onSearch} className="mb-4 flex flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1"><Search size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--ew-muted)]" />
            <input aria-label="جست‌وجوی فایل اکسل" value={fileQuery} onChange={e=>setFileQuery(e.target.value)} placeholder="جست‌وجو در نام فایل" className="employee-input pr-11" /></div>
          <button className="employee-secondary-button">جست‌وجو</button>
        </form>
        {history.length === 0 ? <p className="text-sm text-[var(--ew-muted)]">فایلی پیدا نشد.</p> :
          <div className="employee-scroll overflow-x-auto"><table className="employee-table min-w-[870px]">
            <thead><tr>{['نام فایل','ثبت‌کننده','وضعیت','موفق','خطادار','تاریخ','عملیات'].map(x=><th key={x} className="p-3">{x}</th>)}</tr></thead>
            <tbody>{history.map(batch=><tr key={batch.id}>
              <td className="p-3 font-black text-[var(--ew-text)]">{batch.original_file_name}</td>
              <td className="p-3">{batch.user?.name || 'نامشخص'}{batch.user?.deleted_at ? ' (حذف‌شده)' : ''}</td>
              <td className="p-3">{displayStatus(batch)}</td>
              <td className="p-3">{fa(batch.success_rows)}</td>
              <td className="p-3">{fa(batch.failed_rows)}</td>
              <td className="p-3">{new Date(batch.created_at).toLocaleDateString('fa-IR')}</td>
              <td className="p-3"><div className="flex flex-wrap gap-2">
                <Link to={`/employee/imports/${batch.id}`} className="employee-soft-button !px-3 !py-2 !text-xs">مشاهده گروه</Link>
                {batch.failed_rows > 0 && <button type="button" onClick={() => void downloadErrorReport(batch.id)} disabled={reportingId === batch.id}
                  className="employee-soft-button !px-3 !py-2 !text-xs"><Download size={14}/> گزارش خطا</button>}
                {ownId === batch.user_id && batch.failed_rows > 0 && batch.status !== 'processing' &&
                  <button type="button" onClick={() => void retryFailed(batch)} disabled={retryingId === batch.id}
                    className="employee-soft-button !px-3 !py-2 !text-xs"><RotateCcw size={14}/> تلاش مجدد خطاها</button>}
                {ownId === batch.user_id && <button type="button" onClick={() => void deleteBatch(batch)}
                  className="employee-danger-button !px-3 !py-2 !text-xs"><Trash2 size={14}/> حذف گروه</button>}
              </div></td>
            </tr>)}</tbody>
          </table></div>}
        <div className="mt-5 flex items-center justify-center gap-4 text-sm">
          <button type="button" disabled={historyPage <= 1} onClick={() => setHistoryPage(p=>p-1)} className="employee-soft-button !px-4 !py-2">قبلی</button>
          <span>{fa(historyPage)} از {fa(historyLastPage)}</span>
          <button type="button" disabled={historyPage >= historyLastPage} onClick={() => setHistoryPage(p=>p+1)} className="employee-soft-button !px-4 !py-2">بعدی</button>
        </div>
      </section>
    </div>
  </DashboardLayout>;
}

function Box({ label, value }: { label: string; value: number }) {
  return <div className="employee-stat-card text-center"><p className="text-xs font-bold text-[var(--ew-muted)]">{label}</p>
    <strong className="mt-2 block text-2xl font-black text-[var(--ew-text)]">{fa(value)}</strong></div>;
}
