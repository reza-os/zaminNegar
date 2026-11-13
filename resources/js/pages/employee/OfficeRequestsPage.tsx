import * as React from 'react';
import { CheckCircle2, ClipboardList, LoaderCircle, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';

const statuses = {
  new: 'جدید', in_review: 'در حال بررسی', contacted: 'تماس گرفته شد',
  accepted: 'پذیرفته‌شده', rejected: 'ردشده',
} as const;
type Status = keyof typeof statuses;
type OfficeRequest = {
  id: number; branch_id: number; tracking_code: string; full_name: string;
  mobile: string; description: string | null; status: Status;
  created_at: string; branch?: { id: number; name: string; city: string | null };
};
type RequestDetail = OfficeRequest & { national_id: string; internal_note: string | null };
type PageResponse = { data: OfficeRequest[]; current_page: number; last_page: number; total: number };

const friendlyError = (err: unknown) => (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'ارتباط با سرور انجام نشد.';
const displayDate = (v: string) => new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v));

export default function OfficeRequestsPage() {
  const [items, setItems] = React.useState<OfficeRequest[]>([]);
  const [filter, setFilter] = React.useState<Status | ''>('new');
  const [page, setPage] = React.useState(1);
  const [pages, setPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [selected, setSelected] = React.useState<RequestDetail | null>(null);
  const [nextStatus, setNextStatus] = React.useState<Status>('in_review');
  const [note, setNote] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [detailError, setDetailError] = React.useState('');
  const [reload, setReload] = React.useState(0);
  const [message, setMessage] = React.useState('');

  React.useEffect(() => {
    let alive = true;
    setLoading(true);
    setError('');
    api.get<PageResponse>('/case-requests', { params: { page, ...(filter ? { status: filter } : {}) } })
      .then(({ data }) => { if (alive) { setItems(data.data); setPages(data.last_page); setTotal(data.total); } })
      .catch(err => { if (alive) setError(friendlyError(err)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [page, filter, reload]);

  const inspect = async (id: number) => {
    setDetailError('');
    setBusy(true);
    try {
      const { data } = await api.get<{ data: RequestDetail }>(`/case-requests/${id}`);
      setSelected(data.data);
      setNextStatus(data.data.status);
      setNote(data.data.internal_note || '');
    } catch (err) { setDetailError(friendlyError(err)); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!selected) return;
    setBusy(true); setDetailError('');
    try {
      await api.patch(`/case-requests/${selected.id}`, { status: nextStatus, internal_note: note });
      setMessage(`وضعیت درخواست ${selected.tracking_code} ذخیره شد.`);
      setSelected(null);
      setReload(current => current + 1);
    } catch (err) { setDetailError(friendlyError(err)); }
    finally { setBusy(false); }
  };

  return <DashboardLayout>
    <div className="space-y-5" dir="rtl">
      <section className="rounded-3xl bg-slate-950 p-6 text-white md:p-8">
        <div className="flex items-start justify-between gap-4">
          <div><div className="mb-3 flex items-center gap-2 text-sm text-emerald-300"><ClipboardList size={18}/> درخواست‌های آنلاین</div>
            <h1 className="text-2xl font-black md:text-3xl">درخواست‌های دفتر</h1>
            <p className="mt-2 text-sm leading-7 text-slate-300">درخواست‌های سایت برای دفتر اختصاص‌یافته به شما نمایش داده می‌شوند؛ مدیر به درخواست‌های همه دفترها دسترسی دارد.</p>
          </div>
          <button type="button" onClick={() => setReload(v => v + 1)} className="rounded-xl border border-white/30 p-3 text-emerald-100 hover:bg-white/10" title="به‌روزرسانی فهرست" aria-label="به‌روزرسانی"><RefreshCw size={19}/></button>
        </div>
      </section>
      <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-bold text-slate-700"><Search size={17}/> فیلتر وضعیت
            <select className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" value={filter} onChange={e => { setFilter(e.target.value as Status | ''); setPage(1); }}>
              <option value="">همه درخواست‌ها</option>
              {(Object.entries(statuses) as [Status,string][]).map(([v, label]) => <option value={v} key={v}>{label}</option>)}
            </select>
          </label>
          <span className="text-xs text-slate-500">تعداد: {total.toLocaleString('fa-IR')}</span>
        </div>
        {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {message && <p role="status" className="mb-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"><CheckCircle2 className="ml-1 inline" size={17}/>{message}</p>}
        {detailError && !selected && <p role="alert" className="mb-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{detailError}</p>}
        {loading ? <div className="flex items-center justify-center gap-2 py-14 text-slate-500"><LoaderCircle size={20} className="animate-spin"/> در حال دریافت درخواست‌ها...</div> :
          items.length ? <div className="space-y-3">{items.map(item => <article key={item.id} className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><strong className="text-slate-900">{item.full_name}</strong><span className="rounded-lg bg-emerald-100 px-2 py-1 text-xs text-emerald-900">{statuses[item.status] || item.status}</span></div>
              <p className="mt-2 break-all text-xs text-slate-600">کد پیگیری: <b dir="ltr">{item.tracking_code}</b> · همراه: <span dir="ltr">{item.mobile}</span></p>
              <p className="mt-2 text-xs text-slate-500">{item.branch?.name || 'دفتر'} · {displayDate(item.created_at)}</p>
              {item.description && <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-600">{item.description}</p>}
            </div>
            <button type="button" disabled={busy} onClick={() => void inspect(item.id)} className="shrink-0 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-50">بررسی درخواست</button>
          </article>)}</div> : <p className="py-12 text-center text-sm text-slate-500">درخواستی با این وضعیت ثبت نشده است.</p>}
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button type="button" disabled={loading || page <= 1} onClick={() => setPage(p => p-1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">قبلی</button>
          <span>{page.toLocaleString('fa-IR')} از {Math.max(1,pages).toLocaleString('fa-IR')}</span>
          <button type="button" disabled={loading || page >= pages} onClick={() => setPage(p => p+1)} className="rounded-lg border px-3 py-2 disabled:opacity-40">بعدی</button>
        </div>
      </section>
      {selected && <div role="presentation" className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto bg-slate-950/60 p-4" onMouseDown={e => { if (e.target === e.currentTarget && !busy) setSelected(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="zng-request-detail-title" className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7">
          <div className="flex items-center justify-between gap-4"><h2 id="zng-request-detail-title" className="text-lg font-black">جزئیات درخواست {selected.tracking_code}</h2><button type="button" onClick={() => setSelected(null)} className="text-sm text-slate-500 hover:text-slate-950">بستن</button></div>
          <div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-700 sm:grid-cols-2">
            <p>نام: <strong>{selected.full_name}</strong></p><p>دفتر: {selected.branch?.name || `شناسه ${selected.branch_id}`}</p>
            <p>تلفن: <b dir="ltr">{selected.mobile}</b></p><p>کد ملی: <b dir="ltr">{selected.national_id}</b></p>
            <p className="sm:col-span-2">توضیحات: {selected.description || 'ثبت نشده'}</p>
          </div>
          <div className="mt-5 space-y-4"><label className="block text-sm font-bold">وضعیت رسیدگی
            <select className="mt-2 block w-full rounded-xl border border-slate-200 p-3" value={nextStatus} onChange={e => setNextStatus(e.target.value as Status)}>
              {(Object.entries(statuses) as [Status,string][]).map(([v,label]) => <option key={v} value={v}>{label}</option>)}
            </select></label>
            <label className="block text-sm font-bold">یادداشت داخلی (برای کارکنان؛ به متقاضی نمایش داده نمی‌شود)
              <textarea className="mt-2 block w-full rounded-xl border border-slate-200 p-3 text-sm" maxLength={2000} rows={3} value={note} onChange={e => setNote(e.target.value)}/>
            </label></div>
          {detailError && <p role="alert" className="mt-3 text-sm text-red-700">{detailError}</p>}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="flex items-center gap-1 text-xs text-slate-500"><ShieldCheck size={15}/> فقط کاربران مجاز به دفتر دسترسی دارند.</p><button type="button" disabled={busy} onClick={() => void save()} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'در حال ثبت...' : 'ثبت وضعیت'}</button></div>
        </section>
      </div>}
    </div>
  </DashboardLayout>;
}
