import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Loader2, RotateCcw, Search, ShieldAlert, Trash2 } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import './employee-warm.css';

type DeletedCase = {
  id: number;
  case_number: string;
  owner_full_name: string;
  national_code?: string | null;
  village_name?: string | null;
  deleted_at: string;
};
type Response = {
  data: DeletedCase[];
  meta: { current_page: number; last_page: number; total: number };
};
const fa = (n: number) => n.toLocaleString('fa-IR');
const faDate = (raw: string) => {
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(raw)); }
  catch { return '-'; }
};

export default function CaseTrashPage() {
  const [items, setItems] = useState<DeletedCase[]>([]);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [input, setInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const requestNumber = useRef(0);

  const load = useCallback(async () => {
    const current = ++requestNumber.current;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get<Response>('/survey-cases/trash', {
        params: { page, per_page: 25, search: search || undefined },
      });
      if (requestNumber.current !== current) return;
      setItems(data.data ?? []);
      setTotal(data.meta?.total ?? 0);
      setLastPage(Math.max(1, data.meta?.last_page ?? 1));
    } catch (err: any) {
      if (requestNumber.current === current) setError(err.response?.data?.message || 'دریافت پرونده‌های حذف‌شده ناموفق بود.');
    } finally {
      if (requestNumber.current === current) setLoading(false);
    }
  }, [page, search]);
  useEffect(() => { void load(); return () => { requestNumber.current++; }; }, [load]);

  const searchCases = (event: FormEvent) => {
    event.preventDefault();
    setPage(1);
    setSearch(input.trim());
  };

  const run = async (item: DeletedCase, permanent: boolean) => {
    const description = permanent
      ? `پرونده «${item.case_number}» به‌صورت غیرقابل‌بازیابی از فهرست عملیاتی حذف شود؟ سوابق حسابرسی شرکت باقی می‌ماند. در صورت وجود فاکتور یا سند، عملیات متوقف خواهد شد.`
      : `پرونده «${item.case_number}» با همان شناسه و سابقه به فهرست فعال بازگردد؟`;
    if (!window.confirm(description)) return;
    setBusy(item.id);
    setError('');
    setNotice('');
    try {
      const { data } = permanent
        ? await api.delete<{ message: string }>(`/survey-cases/${item.id}/permanent`)
        : await api.post<{ message: string }>(`/survey-cases/${item.id}/restore`);
      setNotice(data.message);
      if (items.length === 1 && page > 1) setPage(page - 1);
      else await load();
    } catch (err: any) {
      const field = Object.values(err.response?.data?.errors || {}).flat()[0];
      setError(String(field || err.response?.data?.message || 'انجام عملیات ناموفق بود.'));
    } finally { setBusy(null); }
  };

  return <DashboardLayout>
    <div className="employee-warm-page space-y-6" dir="rtl">
      <header className="employee-hero flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="employee-badge-soft mb-3">پرونده‌های حذف‌شده</div>
          <h1 className="text-2xl font-black text-[var(--ew-text)]">سطل زباله پرونده‌های من</h1>
          <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--ew-muted)]">
            پرونده‌هایی که خودتان حذف کرده‌اید در اینجا باقی می‌مانند و می‌توانید آن‌ها را بازیابی کنید یا از فهرست عملیاتی حذف دائمی کنید.
          </p>
        </div>
        <Link to="/employee/cases" className="employee-secondary-button"><ArrowRight size={17}/> بازگشت به پرونده‌های فعال</Link>
      </header>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
        <div className="flex items-center gap-2 font-bold"><ShieldAlert size={19}/> تفاوت سطل زباله و آرشیو دائمی</div>
        <p>«حذف دائمی» رکورد را از بخش عملیاتی پاک می‌کند، اما نسخه تاریخی رمزگذاری‌شده در آرشیو حسابرسی شرکت باقی می‌ماند. پرونده‌های دارای فاکتور مالی یا سند پیوست برای محافظت از داده‌ها حذف دائمی نمی‌شوند.</p>
      </div>
      <form onSubmit={searchCases} className="employee-panel flex flex-wrap gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search size={19} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--ew-muted)]"/>
          <input className="employee-input pr-12" aria-label="جست‌وجو در پرونده‌های حذف‌شده" value={input} onChange={e=>setInput(e.target.value)} placeholder="شماره پرونده، نام مالک، کد ملی یا روستا" />
        </div>
        <button className="employee-secondary-button" type="submit">جست‌وجو</button>
        {search && <button type="button" className="employee-soft-button" onClick={()=>{setInput('');setSearch('');setPage(1);}}>پاک‌کردن جست‌وجو</button>}
      </form>
      {error && <p role="alert" className="employee-alert">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-bold text-emerald-800">{notice}</p>}
      <section className="employee-table-wrap">
        <div className="mb-4 text-sm font-semibold text-[var(--ew-muted)]">{fa(total)} پرونده حذف‌شده</div>
        {loading ? <div className="employee-empty flex items-center justify-center gap-3"><Loader2 className="animate-spin" size={19}/> در حال دریافت...</div>
          : items.length === 0 ? <div className="employee-empty">پرونده حذف‌شده‌ای پیدا نشد.</div>
          : <div className="employee-scroll overflow-x-auto">
            <table className="employee-table min-w-[760px]">
              <thead><tr><th className="p-4">شماره</th><th className="p-4">مالک</th><th className="p-4">کد ملی</th><th className="p-4">روستا</th><th className="p-4">زمان حذف</th><th className="p-4">عملیات</th></tr></thead>
              <tbody>{items.map(item=><tr key={item.id}>
                <td className="p-4 font-bold">{item.case_number}</td>
                <td className="p-4">{item.owner_full_name}</td>
                <td className="p-4">{item.national_code || '-'}</td>
                <td className="p-4">{item.village_name || '-'}</td>
                <td className="p-4">{faDate(item.deleted_at)}</td>
                <td className="p-4"><div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy !== null} onClick={()=>void run(item,false)} className="employee-secondary-button !px-3 !py-2 !text-xs">
                    {busy===item.id?<Loader2 className="animate-spin" size={15}/>:<RotateCcw size={15}/>} بازیابی
                  </button>
                  <button type="button" disabled={busy !== null} onClick={()=>void run(item,true)} className="employee-danger-button !px-3 !py-2 !text-xs">
                    {busy===item.id?<Loader2 className="animate-spin" size={15}/>:<Trash2 size={15}/>} حذف دائمی
                  </button>
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>}
        <div className="mt-5 flex justify-center gap-3 text-sm">
          <button type="button" disabled={page <= 1 || loading || busy !== null} onClick={()=>setPage(p=>p-1)} className="employee-soft-button">قبلی</button>
          <span className="self-center">صفحه {fa(page)} از {fa(lastPage)}</span>
          <button type="button" disabled={page >= lastPage || loading || busy !== null} onClick={()=>setPage(p=>p+1)} className="employee-soft-button">بعدی</button>
        </div>
      </section>
    </div>
  </DashboardLayout>;
}
