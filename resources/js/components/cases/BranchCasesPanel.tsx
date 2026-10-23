import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { api } from '../../api/client';
import CaseFiltersPanel, { caseFilterParams, emptyCaseFilters, type CaseFilters } from './CaseFiltersPanel';

type CaseRow = {
  id: number;
  case_number: string;
  owner_full_name: string;
  national_code?: string | null;
  village_name?: string | null;
  phone?: string | null;
  created_at: string;
  activity_state?: string | null;
  registration_state?: string | null;
  status?: { title: string } | null;
  stage?: { title: string } | null;
  creator?: { name: string } | null;
};
type PageMeta = { current_page: number; last_page: number; total: number };
type Response = { data: CaseRow[]; meta: PageMeta };
const fa = (num: number) => num.toLocaleString('fa-IR');
const stateLabels: Record<string, string> = { active: 'فعال', inactive: 'غیرفعال', registered: 'ثبت‌شده', unregistered: 'ثبت‌نشده' };

export default function BranchCasesPanel({ branchId }: { branchId: number }) {
  const [filters, setFilters] = useState<CaseFilters>(emptyCaseFilters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const current = ++requestId.current;
    setLoading(true); setError('');
    try {
      const response = await api.get<Response>(`/manager/branches/${branchId}/cases`, {
        params: { ...caseFilterParams(filters), page, per_page: 20 },
      });
      if (current === requestId.current) setData(response.data);
    } catch (err: any) {
      if (current === requestId.current) setError(err.response?.data?.message || 'دریافت پرونده‌های شعبه ناموفق بود.');
    } finally { if (current === requestId.current) setLoading(false); }
  }, [branchId, filters, page]);
  useEffect(() => { void load(); return () => { requestId.current += 1; }; }, [load]);

  const apply = (next: CaseFilters) => { setPage(1); setExpanded(null); setFilters(next); };

  return <section className="space-y-6" aria-label="پرونده‌های شعبه">
    <CaseFiltersPanel value={filters} onApply={apply} title="پرونده‌های شعبه؛ جست‌وجو و فیلتر" />
    <div className="rounded-[1.9rem] border border-[#e7c5a1] bg-white p-4 shadow-[0_8px_0_#efdac2,0_18px_34px_-24px_rgba(130,72,44,.4)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-black text-[#603523]"><FileText className="text-[#bf6c40]" size={21}/> فهرست پرونده‌های شعبه</h2>
        <span className="rounded-full bg-[#fff1e2] px-4 py-2 text-xs font-bold text-[#95523a]">
          {data ? `${fa(data.meta.total)} پرونده مطابق فیلتر` : 'در حال دریافت آمار'}
        </span>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
      {loading ? <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-[#925f48]"><Loader2 size={20} className="animate-spin"/> در حال بارگذاری پرونده‌ها...</div>
      : !data?.data.length ? <p className="rounded-xl bg-[#fff8f1] p-8 text-center text-sm text-[#925f48]">پرونده‌ای مطابق فیلترها پیدا نشد.</p>
      : <div className="max-h-[560px] overflow-auto rounded-xl border border-[#f0dbc6]" style={{ scrollbarWidth: 'thin' }}>
          <table className="w-full min-w-[980px] border-collapse text-right text-sm">
            <thead className="sticky top-0 z-10 bg-[#f8e0c9] text-[#6d3a28]">
              <tr>{['شماره پرونده', 'نام مالک', 'روستا', 'وضعیت فعالیت', 'وضعیت ثبت', 'وضعیت پرونده', 'مرحله', 'ثبت‌کننده'].map((title) => <th key={title} className="whitespace-nowrap p-3 font-black">{title}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-[#f1e2d4]">
              {data.data.map((item) => <Fragment key={item.id}>
                <tr key={`row-${item.id}`} className="cursor-pointer hover:bg-[#fff5eb]" onClick={() => setExpanded((prev) => prev === item.id ? null : item.id)}>
                  <td className="p-3 font-black text-[#995036]"><button type="button" className="underline-offset-4 hover:underline" aria-expanded={expanded === item.id} onClick={(e) => { e.stopPropagation(); setExpanded((prev) => prev === item.id ? null : item.id); }}>{item.case_number}</button></td>
                  <td className="p-3">{item.owner_full_name}</td>
                  <td className="p-3">{item.village_name || '—'}</td>
                  <td className="p-3">{stateLabels[item.activity_state || ''] || 'نامشخص'}</td>
                  <td className="p-3">{stateLabels[item.registration_state || ''] || 'نامشخص'}</td>
                  <td className="p-3">{item.status?.title || '—'}</td>
                  <td className="p-3">{item.stage?.title || '—'}</td>
                  <td className="p-3">{item.creator?.name || 'نامشخص'}</td>
                </tr>
                {expanded === item.id && <tr key={`details-${item.id}`} className="bg-[#fff8f1]"><td colSpan={8} className="p-4"><div className="flex flex-wrap gap-4 text-xs text-[#774b3b]"><span>کد ملی: {item.national_code || '—'}</span><span>شماره تماس: {item.phone || '—'}</span><span>تاریخ ثبت: {new Date(item.created_at).toLocaleDateString('fa-IR')}</span></div><p className="mt-2 text-xs text-[#a06b50]">این بخش برای منیجر فقط خواندنی است.</p></td></tr>}
              </Fragment>)}
            </tbody>
          </table>
        </div>}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4 text-sm text-[#80523e]">
        <span>{data ? `صفحه ${fa(data.meta.current_page)} از ${fa(data.meta.last_page)}` : ''}</span>
        <div className="flex gap-2">
          <button type="button" disabled={loading || page <= 1} onClick={() => { setPage(p => p - 1); setExpanded(null); }} className="rounded-xl border border-[#eac8a6] bg-[#fff7ef] px-4 py-2 font-bold disabled:opacity-40">قبلی</button>
          <button type="button" disabled={loading || !data || page >= data.meta.last_page} onClick={() => { setPage(p => p + 1); setExpanded(null); }} className="rounded-xl bg-[#b65f39] px-4 py-2 font-bold text-white disabled:opacity-40">بعدی</button>
        </div>
      </div>
    </div>
  </section>;
}
