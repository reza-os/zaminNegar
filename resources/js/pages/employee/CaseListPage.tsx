import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { FilePlus2, Loader2, Search } from 'lucide-react';

import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import CaseActionsDialog from '../../components/employee/CaseActionsDialog';
import './employee-warm.css';

type User = { id: number; name: string; role: string };
type CaseItem = {
  id: number;
  can_edit?: boolean;
  can_delete?: boolean;
  case_number: string;
  owner_full_name: string;
  national_code?: string | null;
  phone?: string | null;
  village_name?: string | null;
  file_location?: string | null;
  archive_code?: string | null;
  created_at: string;
  status?: { title: string; color: string } | null;
  stage?: { title: string; color: string } | null;
  priority?: { title: string; color: string } | null;
};
type Meta = { current_page: number; last_page: number; per_page: number; total: number; from?: number | null; to?: number | null; has_more: boolean };
const emptyMeta: Meta = { current_page: 1, last_page: 1, per_page: 25, total: 0, from: null, to: null, has_more: false };

function normalizeResponse(responseData: any): { items: CaseItem[]; meta: Meta } {
  if (Array.isArray(responseData)) {
    return { items: responseData, meta: { ...emptyMeta, total: responseData.length, to: responseData.length } };
  }
  const items = Array.isArray(responseData?.data) ? responseData.data : [];
  const meta = responseData?.meta || {};
  return {
    items,
    meta: {
      current_page: Number(meta.current_page || 1),
      last_page: Number(meta.last_page || 1),
      per_page: Number(meta.per_page || 25),
      total: Number(meta.total || items.length),
      from: meta.from ?? null,
      to: meta.to ?? items.length,
      has_more: Boolean(meta.has_more ?? Number(meta.current_page || 1) < Number(meta.last_page || 1)),
    },
  };
}
const formatNumber = (value: number) => new Intl.NumberFormat('fa-IR').format(value);
const formatDate = (value: string) => {
  try { return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  catch { return '-'; }
};

export default function CaseListPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [meta, setMeta] = useState<Meta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [selectedCase, setSelectedCase] = useState<CaseItem | null>(null);
  const [actionError, setActionError] = useState('');
  const openerRef = useRef<HTMLButtonElement | null>(null);
  const canDelete = currentUser?.role === 'employee' || currentUser?.role === 'surveyor';

  useEffect(() => { api.get('/auth/me').then((response) => setCurrentUser(response.data?.user || response.data)).catch(() => setCurrentUser(null)); }, []);

  const fetchCases = useCallback(async (page = 1, append = false) => {
    if (append) setLoadingMore(true); else { setLoading(true); setCases([]); }
    setError('');
    try {
      const response = await api.get('/survey-cases', { params: { page, per_page: 25, search: activeSearch || undefined } });
      const normalized = normalizeResponse(response.data);
      setCases((previous) => {
        if (!append) return normalized.items;
        const map = new Map<number, CaseItem>();
        previous.forEach((item) => map.set(item.id, item));
        normalized.items.forEach((item) => map.set(item.id, item));
        return Array.from(map.values());
      });
      setMeta(normalized.meta);
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در دریافت لیست پرونده‌ها');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [activeSearch]);

  useEffect(() => { void fetchCases(1, false); }, [fetchCases]);
  const handleSearch = (event: FormEvent) => { event.preventDefault(); setActiveSearch(searchInput.trim()); };
  const clearSearch = () => { setSearchInput(''); setActiveSearch(''); };
  const openActions = (item: CaseItem, opener: HTMLButtonElement | null) => {
    openerRef.current = opener;
    setActionError('');
    setSelectedCase(item);
  };
  const closeActions = useCallback(() => { setSelectedCase(null); setActionError(''); }, []);

  const deleteCase = async (item: CaseItem) => {
    if (!canDelete || item.can_delete === false) return setError('شما اجازه حذف پرونده را ندارید.');
    const confirmed = window.confirm(`آیا از حذف پرونده «${item.case_number} - ${item.owner_full_name}» مطمئن هستید؟`);
    if (!confirmed) return;
    setDeletingId(item.id); setError('');
    try {
      await api.delete(`/survey-cases/${item.id}`);
      setCases((previous) => previous.filter((caseItem) => caseItem.id !== item.id));
      setMeta((previous) => ({ ...previous, total: Math.max(previous.total - 1, 0) }));
      closeActions();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'خطا در حذف پرونده');
    } finally { setDeletingId(null); }
  };

  return (
    <DashboardLayout>
      <div className="employee-warm-page space-y-6" dir="rtl">
        <div className="employee-hero flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="employee-badge-soft mb-3">مدیریت پرونده‌های من</div>
            <h1 className="text-2xl font-black text-[var(--ew-text)]">پرونده‌های ثبت‌شده کارکن</h1>
            <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--ew-muted)]">ثبت، جست‌وجو، ویرایش و حذف پرونده‌های واردشده توسط خودتان در یک نمای گرم و یکدست.</p>
          </div>
          <Link to="/employee/cases/create" className="employee-button">
            <FilePlus2 size={18} />
            ثبت پرونده جدید
          </Link>
        </div>

        <div className="employee-grid-3">
          <div className="employee-stat-card"><div className="text-xs font-bold text-[var(--ew-muted)]">کل پرونده‌های من</div><div className="mt-2 text-2xl font-black">{formatNumber(meta.total)}</div></div>
          <div className="employee-stat-card"><div className="text-xs font-bold text-[var(--ew-muted)]">نمایش فعلی</div><div className="mt-2 text-2xl font-black">{formatNumber(cases.length)}</div></div>
          <div className="employee-stat-card"><div className="text-xs font-bold text-[var(--ew-muted)]">جست‌وجوی فعال</div><div className="mt-2 text-sm font-black">{activeSearch || 'بدون فیلتر'}</div></div>
        </div>

        <form onSubmit={handleSearch} className="employee-panel">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--ew-muted)]" size={20} />
              <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="جستجو بر اساس شماره پرونده، نام، کد ملی، روستا، محل پرونده یا شماره تماس..." className="employee-input pr-12" />
            </div>
            <button type="submit" className="employee-secondary-button">جستجو</button>
            {activeSearch && <button type="button" onClick={clearSearch} className="employee-soft-button">حذف جستجو</button>}
          </div>
        </form>

        {error && <div className="employee-alert">{error}</div>}

        {loading ? (
          <div className="employee-empty flex min-h-64 items-center justify-center"><div className="flex items-center gap-3 text-[var(--ew-muted)]"><Loader2 className="animate-spin" /> در حال دریافت پرونده‌ها...</div></div>
        ) : (
          <div className="employee-table-wrap overflow-hidden">
            {cases.length === 0 ? (
              <div className="employee-empty"><div className="text-lg font-black">پرونده‌ای برای نمایش وجود ندارد</div><div className="mt-2 text-sm text-[var(--ew-muted)]">اگر جستجو فعال است، عبارت جستجو را تغییر بده.</div></div>
            ) : (
              <>
                <div className="mb-3 text-xs font-bold leading-6 text-[var(--ew-muted)]">برای مشاهده گزینه‌های ویرایش و حذف، روی هر ردیف یا شماره پرونده کلیک کنید.</div>
                <div className="employee-scroll overflow-x-auto">
                  <table className="employee-table">
                    <thead>
                      <tr>
                        <th className="px-5 py-4">شماره پرونده</th><th className="px-5 py-4">نام و نام خانوادگی</th><th className="px-5 py-4">کد ملی</th><th className="px-5 py-4">شماره تماس</th><th className="px-5 py-4">روستا</th><th className="px-5 py-4">محل پرونده</th><th className="px-5 py-4">وضعیت</th><th className="px-5 py-4">مرحله</th><th className="px-5 py-4">اولویت</th><th className="px-5 py-4">تاریخ ثبت</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cases.map((item) => (
                        <tr
                          key={item.id}
                          className="cursor-pointer transition-colors hover:!bg-[#fff0e1] focus-within:!bg-[#fff0e1]"
                          onClick={(event) => {
                            if ((event.target as HTMLElement).closest('button, a')) return;
                            openActions(item, event.currentTarget.querySelector<HTMLButtonElement>('[data-case-open]'));
                          }}
                          title="کلیک برای ویرایش یا حذف پرونده"
                        >
                          <td className="px-5 py-4 font-black text-[var(--ew-text)]">
                            <button
                              type="button"
                              data-case-open
                              onClick={(event) => { event.stopPropagation(); openActions(item, event.currentTarget); }}
                              aria-label={`نمایش عملیات پرونده ${item.case_number} برای ${item.owner_full_name}`}
                              className="rounded-lg px-2 py-1 text-right font-black text-[#9b4c2e] underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c56a3e]"
                            >{item.case_number}</button>
                          </td>
                          <td className="px-5 py-4">{item.owner_full_name}</td>
                          <td className="px-5 py-4">{item.national_code || '-'}</td>
                          <td className="px-5 py-4">{item.phone || '-'}</td>
                          <td className="px-5 py-4">{item.village_name || '-'}</td>
                          <td className="max-w-[260px] truncate px-5 py-4">{item.file_location || '-'}</td>
                          <td className="px-5 py-4"><Badge title={item.status?.title || 'نامشخص'} color={item.status?.color || '#9a6a4f'} /></td>
                          <td className="px-5 py-4"><Badge title={item.stage?.title || 'نامشخص'} color={item.stage?.color || '#9a6a4f'} /></td>
                          <td className="px-5 py-4"><Badge title={item.priority?.title || 'نامشخص'} color={item.priority?.color || '#9a6a4f'} /></td>
                          <td className="px-5 py-4">{formatDate(item.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex flex-col items-center justify-between gap-3 border-t border-[var(--ew-line)] pt-4 md:flex-row">
                  <div className="text-sm font-bold text-[var(--ew-muted)]">{formatNumber(cases.length)} پرونده از {formatNumber(meta.total)} پرونده نمایش داده شده</div>
                  {meta.has_more ? (
                    <button type="button" onClick={() => fetchCases(meta.current_page + 1, true)} disabled={loadingMore} className="employee-button">{loadingMore && <Loader2 size={18} className="animate-spin" />} نمایش بیشتر</button>
                  ) : (
                    <div className="employee-badge-soft">همه پرونده‌ها نمایش داده شد</div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
        {selectedCase && (
          <CaseActionsDialog
            item={selectedCase}
            canDelete={canDelete && selectedCase.can_delete !== false}
            canEdit={selectedCase.can_edit !== false}
            isDeleting={deletingId === selectedCase.id}
            error={actionError}
            onClose={closeActions}
            onDelete={() => void deleteCase(selectedCase)}
            returnFocusTo={openerRef.current}
          />
        )}
      </div>
    </DashboardLayout>
  );
}

function Badge({ title, color }: { title: string; color: string }) {
  return <span className="inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-black text-white shadow-sm" style={{ backgroundColor: color }}>{title}</span>;
}
