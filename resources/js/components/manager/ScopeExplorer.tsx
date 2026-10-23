import { useEffect, useState } from 'react';
import { Building2, ChevronDown, LoaderCircle, Search, UsersRound, X } from 'lucide-react';
import { api } from '../../api/client';
import { errorMessage } from '../../lib/roles';
import type { Analytics, Option, OptionResponse } from './analytics-types';
import { dateTimeFa, fmt } from './analytics-types';
import { MetricTiles, OtherStatuses, RecentLists, StatusDonut, WeeklyBars } from './BentoAnalytics';

type Kind = 'employee' | 'branch';

function useOptions(kind: Kind) {
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Option[]>([]);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = window.setTimeout(() => { setTerm(search.trim()); setPage(1); setItems([]); }, 280);
    return () => window.clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    api.get<OptionResponse>('/manager/dashboard/options', {
      params: { type: kind, search: term, page }, signal: controller.signal,
    }).then(({data}) => {
      if (!controller.signal.aborted) {
        setItems(current => page === 1 ? data.data : [...current, ...data.data]);
        setLastPage(data.last_page);
        setTotal(data.total);
      }
    }).catch(err => {
      if (!controller.signal.aborted) setError(errorMessage(err));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [kind, term, page]);

  return { search, setSearch, page, setPage, items, lastPage, total, loading, error };
}

function useSelectedAnalytics(kind: Kind, id: number | null) {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setData(null);
    setError('');
    if (id === null) { setLoading(false); return; }
    const controller = new AbortController();
    setLoading(true);
    api.get<Analytics>('/manager/dashboard', { params: { scope: kind, id }, signal: controller.signal })
      .then(({data: result}) => { if (!controller.signal.aborted) setData(result); })
      .catch(err => { if (!controller.signal.aborted) setError(errorMessage(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [kind, id]);

  return { data, loading, error };
}

export default function ScopeExplorer({ kind }: { kind: Kind }) {
  const picker = useOptions(kind);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(true);
  const { data, loading, error } = useSelectedAnalytics(kind, selectedId);
  const isEmployee = kind === 'employee';
  const title = isEmployee ? 'بررسی عملکرد کارمند' : 'بررسی عملکرد شعبه';
  const Icon = isEmployee ? UsersRound : Building2;
  const status = data?.status_groups.find(g => g.key === 'case_status');

  return <section className="min-w-0 space-y-5" aria-label={title}>
    <div className="grid min-w-0 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
      <div className="min-w-0 self-start border-[3px] border-slate-950 bg-white p-4 shadow-[6px_6px_0_0_#0f172a]">
        <button type="button" className="flex w-full items-center justify-between gap-2" onClick={() => setIsOpen(!isOpen)} aria-expanded={isOpen}>
          <span className="flex items-center gap-2 text-sm font-black"><Icon size={19}/>{isEmployee ? 'فهرست کارمندان' : 'فهرست شعبه‌ها'}</span>
          <ChevronDown size={19} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}/>
        </button>
        <p className="mt-2 text-[11px] text-slate-500">{fmt(picker.total)} مورد یافت شد</p>
        {isOpen && <div className="mt-4">
          <label className="relative block">
            <Search size={16} className="absolute right-3 top-3 text-slate-500"/>
            <span className="sr-only">جست‌وجوی {isEmployee ? 'کارمند' : 'شعبه'}</span>
            <input value={picker.search} onChange={e => picker.setSearch(e.target.value)} placeholder={isEmployee ? 'نام، موبایل، نام کاربری...' : 'نام، شهر یا کد شعبه...'} className="h-10 w-full border-2 border-slate-950 bg-slate-50 px-10 text-xs outline-none focus:bg-white"/>
            {picker.search && <button type="button" aria-label="پاک‌کردن جست‌وجو" onClick={() => picker.setSearch('')} className="absolute left-2 top-2.5"><X size={16}/></button>}
          </label>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto overscroll-contain border-t-2 border-slate-200 py-2 pr-1 [scrollbar-gutter:stable]" role="listbox" aria-label={title}>
            {picker.items.map(option => <button type="button" role="option" aria-selected={selectedId === option.id} key={option.id} onClick={() => setSelectedId(option.id)}
              className={`w-full min-w-0 border-2 px-3 py-3 text-right text-xs transition-colors ${selectedId === option.id ? 'border-slate-950 bg-amber-200' : 'border-slate-200 bg-slate-50 hover:border-slate-950 hover:bg-white'}`}>
              <span className="block truncate font-extrabold">{option.name}</span>
              <span className="mt-1 block truncate text-[11px] text-slate-600">{isEmployee ? option.branch?.name || 'بدون شعبه' : [option.city, option.code].filter(Boolean).join(' · ') || 'بدون جزئیات'}</span>
            </button>)}
            {!picker.loading && picker.items.length === 0 && <p className="py-5 text-center text-xs text-slate-500">موردی یافت نشد.</p>}
            {picker.page < picker.lastPage && <button type="button" disabled={picker.loading} onClick={() => picker.setPage(p => p+1)} className="w-full border-2 border-slate-950 p-2 text-xs font-black hover:bg-slate-100">{picker.loading ? 'در حال بارگذاری...' : 'موارد بیشتر'}</button>}
          </div>
          {picker.loading && <p role="status" className="flex items-center gap-2 py-2 text-xs"><LoaderCircle size={14} className="animate-spin"/>در حال دریافت...</p>}
          {picker.error && <p role="alert" className="mt-2 text-xs text-rose-700">{picker.error}</p>}
        </div>}
      </div>

      <div className="min-w-0 space-y-5">
        {selectedId === null && <div className="flex min-h-56 items-center justify-center border-[3px] border-dashed border-slate-950 bg-white p-8 text-center text-sm font-bold text-slate-500">برای مشاهده جزئیات، {isEmployee ? 'یک کارمند' : 'یک شعبه'} را از فهرست انتخاب کنید.</div>}
        {loading && <div className="flex min-h-56 items-center justify-center gap-2 border-[3px] border-slate-950 bg-white text-sm"><LoaderCircle className="animate-spin" size={20}/>دریافت آمار...</div>}
        {error && <div role="alert" className="border-[3px] border-rose-700 bg-rose-50 p-6 text-sm text-rose-700">{error}</div>}
        {data && <>
          <div className="border-[3px] border-slate-950 bg-amber-200 p-5 shadow-[6px_6px_0_0_#0f172a]">
            <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-lg font-black">{data.subject?.name}</h3><span className="border-2 border-slate-950 bg-white px-3 py-1 text-xs font-bold">{data.subject?.is_active === false ? 'غیرفعال' : 'فعال'}</span></div>
            {isEmployee ? <div className="mt-4 grid gap-x-5 gap-y-2 break-words text-xs sm:grid-cols-2">
              <span>نام کاربری: <b dir="ltr">{data.subject?.username || '—'}</b></span><span>شعبه: <b>{data.subject?.branch_name || 'بدون شعبه'}</b></span>
              <span>ایمیل: <b dir="ltr">{data.subject?.email || '—'}</b></span><span>موبایل: <b dir="ltr">{data.subject?.mobile || '—'}</b></span>
              <span>آخرین ورود: {dateTimeFa(data.subject?.last_login_at)}</span><span>تاریخ ایجاد: {dateTimeFa(data.subject?.created_at)}</span>
            </div> : <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
              <span>کد شعبه: <b>{data.subject?.code || '—'}</b></span><span>شهر: <b>{data.subject?.city || '—'}</b></span>
              <span className="sm:col-span-2">آدرس: {data.subject?.address || 'ثبت نشده'}</span>
            </div>}
          </div>
          <MetricTiles analytics={data} compact/>
          <div className="grid min-w-0 gap-5 2xl:grid-cols-2">
            <WeeklyBars analytics={data} small/>
            {status && <StatusDonut group={status} small/>}
          </div>
          <OtherStatuses analytics={data}/>
          <RecentLists analytics={data}/>
        </>}
      </div>
    </div>
  </section>;
}
