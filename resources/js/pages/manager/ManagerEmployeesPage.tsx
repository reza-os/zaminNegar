import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Building2, Pencil, Search, Trash2, UserPlus, UsersRound, X } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import { errorMessage } from '../../lib/roles';
import { inputClass, ErrorNotice, Field, SubmitButton } from '../../components/management/Fields';
import './manager-warm.css';
import type { Branch } from './ManagerBranchesPage';

type Employee = {
  id: number; name: string; username: string; email: string; mobile: string | null;
  branch_id: number | null; branch?: { id: number; name: string } | null; is_active: boolean;
};
type EmployeePage = { data: Employee[]; total: number; current_page: number; last_page: number };
type EmployeeForm = { name: string; username: string; email: string; mobile: string; password: string; branch_id: string; is_active: boolean };
const emptyForm: EmployeeForm = { name: '', username: '', email: '', mobile: '', password: '', branch_id: '', is_active: true };

export default function ManagerEmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<EmployeeForm>(emptyForm);
  const [editTarget, setEditTarget] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState<EmployeeForm>(emptyForm);
  const [branchFilter, setBranchFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { const id = window.setTimeout(() => setDebouncedSearch(search.trim()), 300); return () => clearTimeout(id); }, [search]);
  useEffect(() => { setPage(1); }, [branchFilter, debouncedSearch]);

  const fetchEmployees = useCallback(async (signal?: AbortSignal) => {
    const { data } = await api.get<EmployeePage>('/manager/employees', {
      params: { page, per_page: 15, ...(branchFilter ? { branch_id: branchFilter } : {}), ...(debouncedSearch ? { search: debouncedSearch } : {}) },
      signal,
    });
    return data;
  }, [branchFilter, debouncedSearch, page]);

  useEffect(() => {
    const controller = new AbortController();
    api.get<{ data: Branch[] }>('/manager/branches', { signal: controller.signal })
      .then(({ data }) => setBranches(data.data))
      .catch((e) => { if (!controller.signal.aborted) setError(errorMessage(e)); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    fetchEmployees(controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setEmployees(data.data); setTotal(data.total); setPageCount(Math.max(1, data.last_page));
        if (data.current_page > data.last_page && data.last_page > 0) setPage(data.last_page);
      })
      .catch((e) => { if (!controller.signal.aborted) setError(errorMessage(e)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [fetchEmployees]);

  async function refresh() {
    const data = await fetchEmployees();
    setEmployees(data.data); setTotal(data.total); setPageCount(Math.max(1, data.last_page));
    if (data.current_page > data.last_page && data.last_page > 0) setPage(data.last_page);
  }

  async function createEmployee(e: FormEvent) {
    e.preventDefault(); if (busy) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await api.post('/manager/employees', { ...form, branch_id: Number(form.branch_id) });
      setForm(emptyForm); setSuccess('حساب کارمند ایجاد شد.');
      if (page !== 1) setPage(1); else await refresh();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  function startEdit(employee: Employee) {
    setEditTarget(employee);
    setEditForm({ name: employee.name, username: employee.username, email: employee.email,
      mobile: employee.mobile || '', password: '', branch_id: employee.branch_id?.toString() || '', is_active: employee.is_active });
    setError(''); setSuccess('');
  }

  async function saveEmployee(e: FormEvent) {
    e.preventDefault(); if (!editTarget || busy) return;
    setBusy(true); setError(''); setSuccess('');
    try {
      await api.put(`/manager/employees/${editTarget.id}`, {
        ...editForm, branch_id: Number(editForm.branch_id),
        ...(editForm.password ? { password: editForm.password } : { password: null }),
      });
      setEditTarget(null); setSuccess('اطلاعات کارمند ویرایش شد.'); await refresh();
    } catch (e) { setError(errorMessage(e)); } finally { setBusy(false); }
  }

  async function removeEmployee(employee: Employee) {
    if (deletingId !== null || !window.confirm(`حذف کارمند «${employee.name}»؟\nورود او مسدود می‌شود؛ پرونده‌ها و سوابق ثبت‌شده پاک نمی‌شوند.`)) return;
    setDeletingId(employee.id); setError(''); setSuccess('');
    try {
      await api.delete(`/manager/employees/${employee.id}`);
      setSuccess('کارمند از فهرست حذف شد و سوابق او محفوظ ماند.'); await refresh();
    } catch (e) { setError(errorMessage(e)); } finally { setDeletingId(null); }
  }

  const selectBranches = branches.filter((branch) => branch.is_active);
  const activeBranchCount = selectBranches.length;

  return (
    <DashboardLayout>
      <div className="manager-warm">
        <section className="warm-hero" aria-labelledby="employees-page-title">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-3">
                <span className="warm-hero-icon"><UsersRound size={26} /></span>
                <span className="warm-eyebrow">مدیریت منابع انسانی · زمین‌نگار</span>
              </div>
              <h1 id="employees-page-title">کارمندان شرکت</h1>
              <p>ایجاد و مدیریت حساب کارمندان جست‌وجوی سریع و اختصاص هر کارمند به شعبه.</p>
            </div>
            <span className="warm-hero-chip"><Building2 size={16} /> دسترسی به تمام شعب شرکت</span>
          </div>
        </section>

        <div className="mb-7 grid gap-4 sm:grid-cols-3">
          <div className="warm-stat"><span className="warm-stat-icon"><UsersRound size={22} /></span><div><span className="warm-stat-label">کارمندان مطابق فیلتر</span><strong className="warm-stat-value">{total.toLocaleString('fa-IR')}</strong></div></div>
          <div className="warm-stat"><span className="warm-stat-icon"><Building2 size={22} /></span><div><span className="warm-stat-label">شعب فعال شرکت</span><strong className="warm-stat-value">{activeBranchCount.toLocaleString('fa-IR')}</strong></div></div>
          <div className="warm-stat"><span className="warm-stat-icon"><UserPlus size={22} /></span><div><span className="warm-stat-label">تعداد نمایش داده‌شده در صفحه</span><strong className="warm-stat-value">{employees.length.toLocaleString('fa-IR')}</strong></div></div>
        </div>

        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(290px,350px)_minmax(0,1fr)]">
          <section className="warm-panel">
            <div className="warm-panel-header">
              <h2 className="warm-panel-title"><span className="warm-panel-icon"><UserPlus size={19}/></span> افزودن کارمند جدید</h2>
            </div>
            {selectBranches.length === 0 && <p className="warm-tint-message mb-4">برای افزودن کارمند، ابتدا یک شعبه فعال ایجاد کنید.</p>}
            <form onSubmit={createEmployee} className="space-y-4">
              <Field required label="نام و نام خانوادگی" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
              <Field required label="نام کاربری" dir="ltr" value={form.username} onChange={e=>setForm(f=>({...f,username:e.target.value}))}/>
              <Field required label="ایمیل" type="email" dir="ltr" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
              <Field label="شماره موبایل" dir="ltr" value={form.mobile} onChange={e=>setForm(f=>({...f,mobile:e.target.value}))}/>
              <Field required label="رمز اولیه (حداقل ۱۰ کاراکتر)" minLength={10} autoComplete="new-password" type="password" dir="ltr" value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))}/>
              <label className="block text-sm font-semibold">شعبه
                <select required className={inputClass} value={form.branch_id} onChange={e=>setForm(f=>({...f,branch_id:e.target.value}))}>
                  <option value="">انتخاب شعبه</option>
                  {selectBranches.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </label>
              <SubmitButton busy={busy} disabled={selectBranches.length===0}>ایجاد کارمند</SubmitButton>
            </form>
          </section>

          <section className="warm-panel overflow-hidden">
            <div className="warm-panel-header">
              <div>
                <h2 className="warm-panel-title"><span className="warm-panel-icon"><UsersRound size={19}/></span> فهرست کارمندان</h2>
                <p className="mt-2 text-xs leading-6 text-[#8b7063]">برای مشاهده اعضای هر شعبه، فیلتر و جست‌وجو را به‌کار ببر.</p>
              </div>
              <span className="warm-counter">{total.toLocaleString('fa-IR')} نفر</span>
            </div>
            <div className="mb-5 grid gap-3 sm:grid-cols-2">
              <label className="relative block text-xs font-bold">
                <span>جست‌وجوی کارمند</span>
                <Search size={17} className="pointer-events-none absolute right-3 top-[40px] text-[#a16c51]"/>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="نام، ایمیل، نام کاربری یا موبایل" className={`${inputClass} mt-1 pr-10`} aria-label="جست‌وجوی کارمندان"/>
              </label>
              <label className="block text-xs font-bold">فیلتر شعبه
                <select className={`${inputClass} mt-1`} value={branchFilter} onChange={e=>setBranchFilter(e.target.value)}>
                  <option value="">تمام شعب</option>
                  {branches.map(branch=><option key={branch.id} value={branch.id}>{branch.name}{!branch.is_active?' (غیرفعال)':''}</option>)}
                </select>
              </label>
            </div>
            <ErrorNotice message={error}/>
            {success && <p role="status" className="warm-tint-message mb-4">{success}</p>}

            <div className="warm-scroll" aria-label="فهرست اسکرول‌دار کارمندان">
              {loading ? <p className="p-6 text-center text-sm text-[#856c60]">در حال دریافت کارمندان...</p>
                : employees.length === 0 ? <p className="p-6 text-center text-sm text-[#856c60]">کارمندی با این مشخصات پیدا نشد.</p>
                : employees.map(employee => (
                  <article key={employee.id} className="warm-record">
                    <div className="flex min-w-0 flex-wrap items-start justify-between gap-4">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <span className="warm-avatar" aria-hidden="true">{employee.name.trim().slice(0,1) || 'ک'}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-black text-[#4c3129]">{employee.name}</h3>
                            <span className={`warm-badge ${employee.is_active?'warm-badge-active':'warm-badge-inactive'}`}>{employee.is_active?'فعال':'غیرفعال'}</span>
                          </div>
                          <p className="mt-1 break-words text-xs leading-6 text-[#896e60]">{employee.branch?.name || 'بدون شعبه'} · <span dir="ltr" className="inline-block">@{employee.username}</span></p>
                          <p dir="ltr" className="break-all text-right text-xs leading-6 text-[#896e60]">{employee.email}</p>
                          {employee.mobile && <p dir="ltr" className="text-right text-xs text-[#896e60]">{employee.mobile}</p>}
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center gap-2">
                        <button type="button" onClick={()=>startEdit(employee)} className="warm-outline"><Pencil size={14}/> ویرایش</button>
                        <button type="button" disabled={deletingId!==null} onClick={()=>void removeEmployee(employee)} className="warm-outline warm-danger"><Trash2 size={14}/> حذف</button>
                      </div>
                    </div>
                  </article>
                ))}
            </div>
            <div className="warm-pagination mt-5 flex flex-wrap items-center justify-between gap-3">
              <span>صفحه {page.toLocaleString('fa-IR')} از {pageCount.toLocaleString('fa-IR')}</span>
              <div className="flex gap-2">
                <button type="button" disabled={page<=1||loading} onClick={()=>setPage(p=>p-1)} className="warm-outline">قبلی</button>
                <button type="button" disabled={page>=pageCount||loading} onClick={()=>setPage(p=>p+1)} className="warm-outline">بعدی</button>
              </div>
            </div>
          </section>
        </div>

        {editTarget && (
          <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[#2f1a15]/65 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setEditTarget(null)}}>
            <section role="dialog" aria-modal="true" aria-labelledby="employee-edit-title" className="warm-modal my-auto w-full max-w-lg">
              <div className="mb-5 flex items-center justify-between gap-3">
                <h2 id="employee-edit-title" className="text-base font-black text-[#5c3528]">ویرایش کارمند: {editTarget.name}</h2>
                <button type="button" aria-label="بستن" onClick={()=>setEditTarget(null)} className="warm-outline"><X size={18}/></button>
              </div>
              <form onSubmit={saveEmployee} className="max-h-[75vh] space-y-4 overflow-y-auto px-1">
                <Field required label="نام و نام خانوادگی" value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}/>
                <Field required label="نام کاربری" dir="ltr" value={editForm.username} onChange={e=>setEditForm(f=>({...f,username:e.target.value}))}/>
                <Field required label="ایمیل" type="email" dir="ltr" value={editForm.email} onChange={e=>setEditForm(f=>({...f,email:e.target.value}))}/>
                <Field label="موبایل" dir="ltr" value={editForm.mobile} onChange={e=>setEditForm(f=>({...f,mobile:e.target.value}))}/>
                <Field label="رمز جدید (در صورت نیاز، حداقل ۱۰ کاراکتر)" minLength={10} type="password" autoComplete="new-password" dir="ltr" value={editForm.password} onChange={e=>setEditForm(f=>({...f,password:e.target.value}))}/>
                <label className="block text-sm font-semibold">شعبه
                  <select required className={inputClass} value={editForm.branch_id} onChange={e=>setEditForm(f=>({...f,branch_id:e.target.value}))}>
                    {!editForm.branch_id && <option value="">انتخاب شعبه</option>}
                    {branches.filter(b=>b.is_active||b.id===editTarget.branch_id).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={editForm.is_active} onChange={e=>setEditForm(f=>({...f,is_active:e.target.checked}))}/> حساب فعال باشد</label>
                <ErrorNotice message={error}/>
                <div className="flex flex-wrap gap-3"><SubmitButton busy={busy}>ذخیره تغییرات</SubmitButton><button type="button" onClick={()=>setEditTarget(null)} className="warm-outline">انصراف</button></div>
              </form>
            </section>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
