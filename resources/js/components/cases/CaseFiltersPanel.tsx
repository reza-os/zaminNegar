import { FormEvent, useEffect, useState } from 'react';
import { RotateCcw, Search, SlidersHorizontal } from 'lucide-react';
import { api } from '../../api/client';

export type CaseFilters = {
  search: string;
  village: string;
  activity_state: string;
  registration_state: string;
  status_id: string;
  stage_id: string;
  followup_status_id: string;
  financial_status_id: string;
  source: string;
};

export const emptyCaseFilters: CaseFilters = {
  search: '', village: '', activity_state: '', registration_state: '',
  status_id: '', stage_id: '', followup_status_id: '', financial_status_id: '', source: '',
};

export function caseFilterParams(filters: CaseFilters): Record<string, string> {
  return Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== ''));
}

type Lookup = { id: number; title: string };
type LookupGroups = Record<string, Lookup[]>;

const choices = {
  activity_state: [
    { value: 'active', label: 'فعال' },
    { value: 'inactive', label: 'غیرفعال' },
    { value: 'unset', label: 'نامشخص' },
  ],
  registration_state: [
    { value: 'registered', label: 'ثبت‌شده' },
    { value: 'unregistered', label: 'ثبت‌نشده' },
    { value: 'unset', label: 'نامشخص' },
  ],
  source: [
    { value: 'manual', label: 'ثبت دستی' },
    { value: 'excel', label: 'واردشده از اکسل' },
  ],
};

const selectClass = 'w-full min-w-0 rounded-xl border border-[#eac8a6] bg-[#fffaf5] px-3 py-3 text-sm text-[#542e21] outline-none transition focus:border-[#c56a3e] focus:ring-2 focus:ring-[#f2cda7]';

export default function CaseFiltersPanel({ value, onApply, title = 'جست‌وجو و فیلتر پرونده‌ها' }: {
  value: CaseFilters;
  onApply: (filters: CaseFilters) => void;
  title?: string;
}) {
  const [draft, setDraft] = useState<CaseFilters>(value);
  const [options, setOptions] = useState<LookupGroups>({});
  const [optionsError, setOptionsError] = useState(false);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => {
    let live = true;
    api.get<{ data: LookupGroups }>('/survey-cases/filter-options')
      .then(({ data }) => { if (live) setOptions(data.data || {}); })
      .catch(() => { if (live) setOptionsError(true); });
    return () => { live = false; };
  }, []);

  const change = (field: keyof CaseFilters, newValue: string) => {
    setDraft((previous) => ({ ...previous, [field]: newValue }));
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onApply(Object.fromEntries(Object.entries(draft).map(([key, val]) => [key, val.trim()])) as unknown as CaseFilters);
  };
  const reset = () => { setDraft(emptyCaseFilters); onApply(emptyCaseFilters); };

  const select = (field: keyof CaseFilters, label: string, items: { value: string; label: string }[]) => (
    <label className="block min-w-0" key={field}>
      <span className="mb-1.5 block text-xs font-bold text-[#8c5844]">{label}</span>
      <select value={draft[field]} onChange={(event) => change(field, event.target.value)} className={selectClass}>
        <option value="">همه</option>
        {items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  );
  const lookup = (field: keyof CaseFilters, group: string, label: string) => select(
    field, label, (options[group] || []).map((item) => ({ value: String(item.id), label: item.title })),
  );

  return <form onSubmit={submit} dir="rtl" className="relative rounded-[1.8rem] border border-[#efcfaa] bg-gradient-to-b from-white to-[#fff3e7] p-4 shadow-[0_9px_0_#f2dac1,0_18px_40px_-26px_rgba(130,68,35,.45)] sm:p-6">
    <h2 className="mb-5 flex items-center gap-2 text-base font-black text-[#572e21]"><SlidersHorizontal size={19} className="text-[#c56a3e]" />{title}</h2>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <label className="sm:col-span-2 xl:col-span-3">
        <span className="mb-1.5 block text-xs font-bold text-[#8c5844]">جست‌وجوی عمومی</span>
        <div className="relative"><Search size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#a7775e]" />
          <input value={draft.search} onChange={(event) => change('search', event.target.value)} className={`${selectClass} pr-10`} placeholder="شماره پرونده، نام مالک، کد ملی، شماره تماس و ..." />
        </div>
      </label>
      <label><span className="mb-1.5 block text-xs font-bold text-[#8c5844]">نام روستا</span>
        <input value={draft.village} onChange={(event) => change('village', event.target.value)} className={selectClass} placeholder="نام یا بخشی از نام روستا" />
      </label>
      {select('activity_state', 'وضعیت فعالیت', choices.activity_state)}
      {select('registration_state', 'وضعیت ثبت', choices.registration_state)}
      {lookup('status_id', 'case_status', 'وضعیت پرونده')}
      {lookup('stage_id', 'case_stage', 'مرحله پرونده')}
      {lookup('followup_status_id', 'followup_status', 'وضعیت پیگیری')}
      {lookup('financial_status_id', 'financial_status', 'وضعیت مالی')}
      {select('source', 'روش ورود پرونده', choices.source)}
    </div>
    {optionsError && <p role="status" className="mt-3 text-xs text-rose-700">دریافت فهرست وضعیت‌ها ناموفق بود؛ سایر فیلترها در دسترس‌اند.</p>}
    <div className="mt-5 flex flex-wrap gap-3 border-t border-[#f1dbc5] pt-4">
      <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-[#b65f39] px-5 py-3 text-sm font-bold text-white shadow-[0_5px_0_#8c432c] transition hover:bg-[#9e4f2e] active:translate-y-[2px]"><Search size={16}/> اعمال فیلترها</button>
      <button type="button" onClick={reset} className="inline-flex items-center gap-2 rounded-xl border border-[#e4bea1] bg-white px-5 py-3 text-sm font-bold text-[#864b35] transition hover:bg-[#fff5ea]"><RotateCcw size={16}/> پاک‌کردن فیلترها</button>
    </div>
  </form>;
}
