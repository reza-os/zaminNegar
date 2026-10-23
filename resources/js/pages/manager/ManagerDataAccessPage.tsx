import { FormEvent, useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';
import DashboardLayout from '../../layouts/DashboardLayout';

type Employee = { id: number; name: string; branch_id: number; is_active: boolean };
type Branch = { id: number; name: string };
type Resource = {
  id: number;
  branch_id: number;
  original_file_name?: string;
  case_number?: string;
  owner_full_name?: string;
  branch?: Branch;
  user?: { name: string; deleted_at?: string | null } | null;
  creator?: { name: string; deleted_at?: string | null } | null;
};
type Grant = { id: number; employee_id: number; can_edit: boolean; employee?: { name: string } | null };
type Paged<T> = { data: T[]; current_page: number; last_page: number; total: number };

export default function ManagerDataAccessPage() {
  const [scope, setScope] = useState<'batch'|'case'>('batch');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [records, setRecords] = useState<Paged<Resource> | null>(null);
  const [selected, setSelected] = useState<Resource | null>(null);
  const [grants, setGrants] = useState<Grant[]>([]);
  const [employeeOptions, setEmployeeOptions] = useState<Employee[]>([]);
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const paramKey = scope === 'batch' ? 'import_batch_id' : 'survey_case_id';

  useEffect(() => {
    api.get<{ data: Branch[] }>('/manager/branches').then(({data}) => setBranches(data.data || [])).catch(() => setError('فهرست شعب دریافت نشد.'));
  }, []);

  const refreshList = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const path = scope === 'batch' ? '/manager/data-access/batches' : '/manager/data-access/cases';
      const {data} = await api.get<Paged<Resource>>(path, {params:{branch_id:branchId || undefined,search:search || undefined,page}});
      setRecords(data);
    } catch (err: any) { setError(err.response?.data?.message || 'خطا در دریافت اطلاعات'); }
    finally { setLoading(false); }
  }, [scope, branchId, search, page]);
  useEffect(() => { void refreshList(); }, [refreshList]);

  const refreshGrants = useCallback(async (resource: Resource, currentScope: 'batch'|'case') => {
    try {
      const {data} = await api.get<{data:Grant[]}>('/manager/data-access/grants', {params:{[currentScope === 'batch' ? 'import_batch_id' : 'survey_case_id']:resource.id}});
      setGrants(data.data || []);
    } catch { setGrants([]); }
  }, []);

  useEffect(() => {
    if (!selected) { setEmployeeOptions([]);return; }
    let active = true;
    const query = employeeQuery.trim();
    api.get<Paged<Employee>>('/manager/employees', {params:{branch_id:selected.branch_id, search:query||undefined, per_page:30}})
      .then(({data}) => { if (active) setEmployeeOptions((data.data||[]).filter(e=>e.is_active)); })
      .catch(() => { if (active) setEmployeeOptions([]); });
    return () => { active = false; };
  }, [selected,employeeQuery]);

  function pick(resource: Resource) {
    setSelected(resource); setGrants([]);setEmployeeId('');setEmployeeQuery('');setNotice('');setError('');
    void refreshGrants(resource, scope);
  }
  async function grant() {
    if (!selected || !employeeId) return;
    setBusy(true);setError('');setNotice('');
    try {
      await api.post('/manager/data-access/grants', {employee_id:Number(employeeId),[paramKey]:selected.id,can_edit:canEdit});
      await refreshGrants(selected, scope);
      setNotice('دسترسی کارمند ثبت شد.');
    } catch (err:any) { setError(err.response?.data?.message || 'ثبت مجوز موفق نبود.'); }
    finally { setBusy(false); }
  }
  async function revoke(grantId:number) {
    if (!selected || !window.confirm('دسترسی این کارمند لغو شود؟')) return;
    setBusy(true);setError('');
    try { await api.delete(`/manager/data-access/grants/${grantId}`); await refreshGrants(selected,scope);setNotice('دسترسی لغو شد.'); }
    catch (err:any) { setError(err.response?.data?.message || 'لغو دسترسی موفق نبود.'); }
    finally { setBusy(false); }
  }
  function filter(e:FormEvent) { e.preventDefault();setPage(1);setSelected(null);setSearch(searchInput.trim()); }
  function changeScope(value:'batch'|'case') {setScope(value);setPage(1);setSelected(null);setError('');setSearch('');setSearchInput('');}

  return <DashboardLayout><div className="space-y-6" dir="rtl">
    <header className="rounded-[2rem] border border-[#eac7a5] bg-gradient-to-l from-[#ffeedb] to-[#fffaf5] p-6 shadow-[0_9px_0_#f0d9c3]">
      <h1 className="text-2xl font-black text-[#542f23]">دسترسی پرونده‌ها و اکسل‌های شعب</h1>
      <p className="mt-2 text-sm leading-8 text-[#885946]">منبع داده متعلق به شعبه می‌ماند؛ نام ثبت‌کننده حتی پس از حذف نرم حساب حفظ می‌شود. منیجر می‌تواند مشاهده یا ویرایش را فقط به کارکن همان شعبه واگذار کند.</p>
    </header>

    <section className="rounded-3xl border border-[#ead1ba] bg-white p-5 shadow-[0_7px_0_#f3dfc8]">
      <div className="mb-4 flex flex-wrap gap-2">
        <button type="button" aria-pressed={scope==='batch'} onClick={()=>changeScope('batch')} className={`rounded-2xl px-4 py-3 text-sm font-bold ${scope==='batch'?'bg-[#ac5937] text-white':'bg-[#fff2e3] text-[#82533b]'}`}>گروه‌های اکسل</button>
        <button type="button" aria-pressed={scope==='case'} onClick={()=>changeScope('case')} className={`rounded-2xl px-4 py-3 text-sm font-bold ${scope==='case'?'bg-[#ac5937] text-white':'bg-[#fff2e3] text-[#82533b]'}`}>پرونده‌های دستی</button>
      </div>
      <form className="flex flex-col gap-3 sm:flex-row" onSubmit={filter}>
        <select aria-label="فیلتر شعبه" className="rounded-xl border border-[#e3c7ad] bg-[#fffaf5] px-4 py-3 text-sm" value={branchId} onChange={e=>{setBranchId(e.target.value);setPage(1);setSelected(null);}}><option value="">تمام شعب</option>{branches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <input className="min-w-0 flex-1 rounded-xl border border-[#e3c7ad] bg-[#fffaf5] px-4 py-3 text-sm" value={searchInput} onChange={e=>setSearchInput(e.target.value)} placeholder={scope==='batch'?'جست‌وجو در نام فایل':'شماره پرونده یا نام مالک'}/>
        <button type="submit" className="rounded-xl bg-[#ac5937] px-5 py-3 text-sm font-bold text-white">جست‌وجو</button>
      </form>
      {error && <div role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}
      {notice && <div role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#edddcc] p-3">
          <h2 className="mb-3 text-sm font-black text-[#603526]">انتخاب {scope==='batch'?'گروه اکسل':'پرونده'} • {records?.total?.toLocaleString('fa-IR')||'۰'} مورد</h2>
          <div className="max-h-[440px] space-y-2 overflow-y-auto p-1" aria-label="فهرست اطلاعات قابل اشتراک">
            {loading ? <p className="p-3 text-sm">در حال بارگذاری...</p> : !records?.data.length ? <p className="p-3 text-sm text-[#98735d]">داده‌ای برای انتخاب وجود ندارد.</p> : records.data.map(item=><button type="button" key={item.id} onClick={()=>pick(item)} className={`w-full rounded-xl border p-3 text-right text-sm transition hover:border-[#cd986f] ${selected?.id===item.id?'border-[#b75a39] bg-[#fff1df]':'border-[#e9d6c3] bg-[#fffaf6]'}`}>
              <strong className="block break-all text-[#603526]">{scope==='batch'?item.original_file_name:`${item.case_number} · ${item.owner_full_name}`}</strong>
              <span className="mt-2 block text-xs text-[#956c54]">شعبه: {item.branch?.name||'—'} | ثبت‌کننده: {(item.user||item.creator)?.name||'نامشخص'}{(item.user||item.creator)?.deleted_at?' (حساب حذف‌شده)':''}</span>
            </button>)}
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 text-sm"><button type="button" disabled={page<=1} onClick={()=>{setPage(p=>p-1);setSelected(null);}} className="rounded-xl border px-3 py-2 disabled:opacity-30">قبلی</button><span>صفحه {page.toLocaleString('fa-IR')} از {(records?.last_page||1).toLocaleString('fa-IR')}</span><button type="button" disabled={!records||page>=records.last_page} onClick={()=>{setPage(p=>p+1);setSelected(null);}} className="rounded-xl border px-3 py-2 disabled:opacity-30">بعدی</button></div>
        </div>
        <div className="rounded-2xl border border-[#edddcc] bg-[#fffaf6] p-4">
          {!selected ? <p className="text-sm leading-8 text-[#805a47]">یک گروه اکسل یا پرونده را انتخاب کنید تا فهرست دسترسی‌ها و امکان اشتراک‌گذاری نمایش داده شود.</p> : <>
            <h2 className="text-base font-black text-[#5e3626]">مدیریت دسترسی • {scope==='batch'?selected.original_file_name:selected.case_number}</h2>
            <div className="mt-4 space-y-3">
              <label className="block text-sm font-bold text-[#704733]">جست‌وجوی کارکن همان شعبه<input value={employeeQuery} onChange={e=>setEmployeeQuery(e.target.value)} className="mt-2 w-full rounded-xl border border-[#e1c1a5] bg-white px-3 py-3" placeholder="نام، موبایل یا ایمیل"/></label>
              <select aria-label="کارمند دریافت‌کننده دسترسی" className="w-full rounded-xl border border-[#e1c1a5] bg-white px-3 py-3 text-sm" value={employeeId} onChange={e=>setEmployeeId(e.target.value)}><option value="">کارمند را انتخاب کنید</option>{employeeOptions.map(e=><option key={e.id} value={e.id}>{e.name}</option>)}</select>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={canEdit} onChange={e=>setCanEdit(e.target.checked)}/> مجوز ویرایش نیز داشته باشد (حذف مجاز نیست)</label>
              <button type="button" disabled={!employeeId||busy} onClick={()=>void grant()} className="w-full rounded-xl bg-[#b75a39] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{busy?'در حال ثبت...':'ثبت یا تغییر مجوز'}</button>
            </div>
            <div className="mt-5 border-t border-[#e8d1bc] pt-4"><h3 className="mb-3 text-sm font-black">کارکنان دارای دسترسی</h3><div className="max-h-[200px] space-y-2 overflow-y-auto">{grants.length===0?<p className="text-sm text-[#94735d]">مجوزی ثبت نشده است.</p>:grants.map(g=><div key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border bg-white p-3 text-sm"><div><strong>{g.employee?.name||`کارمند #${g.employee_id}`}</strong><p className="mt-1 text-xs text-[#936e58]">{g.can_edit?'مشاهده و ویرایش':'فقط مشاهده'}</p></div><button type="button" onClick={()=>void revoke(g.id)} disabled={busy} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 disabled:opacity-50">لغو</button></div>)}</div></div>
          </>}
        </div>
      </div>
    </section>
  </div></DashboardLayout>;
}
