import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Building2, FileText, Pencil, Search, Trash2, Upload, UsersRound, X } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import { errorMessage } from '../../lib/roles';
import { inputClass, ErrorNotice, Field, SubmitButton } from '../../components/management/Fields';
import './manager-warm.css';

export type Branch = { id: number; name: string; code?: string | null; city?: string | null; address?: string | null; employees_count: number; survey_cases_count: number; import_batches_count: number; activities_count: number; is_active: boolean };
type BranchForm = { name: string; code: string; city: string; address: string; is_active: boolean };
const initial: BranchForm = { name:'', code:'', city:'', address:'', is_active:true };

export default function ManagerBranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [form, setForm] = useState<BranchForm>(initial);
  const [editTarget, setEditTarget] = useState<Branch | null>(null);
  const [editForm, setEditForm] = useState<BranchForm>(initial);
  const [busy, setBusy] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [branchSearch, setBranchSearch] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const load = useCallback(async () => {
    const {data} = await api.get<{data: Branch[]}>('/manager/branches');
    setBranches(data.data);
  }, []);
  useEffect(() => { let mounted = true; api.get<{data:Branch[]}>('/manager/branches').then(({data})=>{if(mounted)setBranches(data.data);}).catch(e=>{if(mounted)setError(errorMessage(e));}).finally(()=>{if(mounted)setLoading(false);});return()=>{mounted=false;}; }, []);

  async function submit(e:FormEvent) {
    e.preventDefault();if(busy)return;setBusy(true);setError('');setSuccess('');
    try {await api.post('/manager/branches',form);setForm(initial);setSuccess('شعبه جدید ایجاد شد.');await load();}
    catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  function openEdit(branch:Branch) {
    setEditTarget(branch); setEditForm({name:branch.name,code:branch.code||'',city:branch.city||'',address:branch.address||'',is_active:branch.is_active});setError('');setSuccess('');
  }
  async function save(e:FormEvent) {
    e.preventDefault(); if(!editTarget||busy)return;setBusy(true);setError('');setSuccess('');
    try {await api.put(`/manager/branches/${editTarget.id}`,editForm);setEditTarget(null);setSuccess('اطلاعات شعبه ذخیره شد.');await load();}
    catch(e){setError(errorMessage(e));}finally{setBusy(false);}
  }
  async function remove(branch:Branch) {
    if(deletingId!==null) return;
    if(branch.employees_count>0){setError('ابتدا تمام کارمندان این شعبه را به شعب دیگر منتقل یا حذف کنید.');return;}
    if(!window.confirm(`حذف شعبه «${branch.name}»؟\nاین کار فقط شعبه را از فهرست حذف می‌کند و سوابق قبلی پاک نمی‌شوند.`))return;
    setDeletingId(branch.id);setError('');setSuccess('');
    try{await api.delete(`/manager/branches/${branch.id}`);setSuccess('شعبه از فهرست حذف شد؛ سوابق محفوظ ماند.');await load();}
    catch(e){setError(errorMessage(e));}finally{setDeletingId(null);}
  }
  const totals = branches.reduce((v,b)=>({employees:v.employees+b.employees_count,cases:v.cases+b.survey_cases_count,imports:v.imports+b.import_batches_count}),{employees:0,cases:0,imports:0});
  const filteredBranches = branches.filter((branch) => {
    const query = branchSearch.trim().toLocaleLowerCase('fa-IR');
    return !query || [branch.name, branch.code, branch.city, branch.address].some((value) => value?.toLocaleLowerCase('fa-IR').includes(query));
  });
  return (
    <DashboardLayout>
      <div className="manager-warm">
        <section className="warm-hero" aria-labelledby="branches-page-title">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div className="min-w-0">
              <div className="mb-3 flex items-center gap-3">
                <span className="warm-hero-icon"><Building2 size={26}/></span>
                <span className="warm-eyebrow">شبکه شعب · زمین‌نگار</span>
              </div>
              <h1 id="branches-page-title">شعبه‌ها و گزارش عملکرد</h1>
              <p>مدیریت اطلاعات شعب، مرور تیم‌ها و مشاهده آمار پرونده‌ها و بارگذاری‌ها در یک نگاه.</p>
            </div>
            <span className="warm-hero-chip"><Building2 size={16}/> {branches.length.toLocaleString('fa-IR')} شعبه ثبت‌شده</span>
          </div>
        </section>

        <div className="mb-7 grid gap-4 sm:grid-cols-3">
          <div className="warm-stat"><span className="warm-stat-icon"><UsersRound size={22}/></span><div><span className="warm-stat-label">کارمندان شعب موجود</span><strong className="warm-stat-value">{totals.employees.toLocaleString('fa-IR')}</strong></div></div>
          <div className="warm-stat"><span className="warm-stat-icon"><FileText size={22}/></span><div><span className="warm-stat-label">پرونده‌های شعب موجود</span><strong className="warm-stat-value">{totals.cases.toLocaleString('fa-IR')}</strong></div></div>
          <div className="warm-stat"><span className="warm-stat-icon"><Upload size={22}/></span><div><span className="warm-stat-label">بارگذاری‌های اکسل</span><strong className="warm-stat-value">{totals.imports.toLocaleString('fa-IR')}</strong></div></div>
        </div>

        <div className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(290px,350px)_minmax(0,1fr)]">
          <section className="warm-panel">
            <div className="warm-panel-header">
              <h2 className="warm-panel-title"><span className="warm-panel-icon"><Building2 size={19}/></span> افزودن شعبه جدید</h2>
            </div>
            <form onSubmit={submit} className="space-y-4">
              <Field required label="نام شعبه" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
              <Field label="کد شعبه (یکتا و اختیاری)" dir="ltr" value={form.code} onChange={e=>setForm(f=>({...f,code:e.target.value}))}/>
              <Field label="شهر" value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))}/>
              <label className="block text-sm font-semibold">آدرس
                <textarea className={inputClass} rows={3} maxLength={255} value={form.address} onChange={e=>setForm(f=>({...f,address:e.target.value}))}/>
              </label>
              <SubmitButton busy={busy}>ثبت شعبه</SubmitButton>
            </form>
          </section>

          <section className="warm-panel overflow-hidden">
            <div className="warm-panel-header">
              <div>
                <h2 className="warm-panel-title"><span className="warm-panel-icon"><Building2 size={19}/></span> فهرست شعب شرکت</h2>
                <p className="mt-2 text-xs leading-6 text-[#8b7063]">شعبه موردنظر را پیدا کن یا برای دیدن فعالیت‌هایش وارد گزارش شو.</p>
              </div>
              <span className="warm-counter">{filteredBranches.length.toLocaleString('fa-IR')} شعبه</span>
            </div>

            <label className="relative mb-4 block text-xs font-bold">
              <span>جست‌وجوی شعبه</span>
              <Search size={17} className="pointer-events-none absolute right-3 top-[40px] text-[#a16c51]"/>
              <input value={branchSearch} onChange={e=>setBranchSearch(e.target.value)} className={`${inputClass} mt-1 pr-10`} placeholder="نام شعبه، کد، شهر یا آدرس" aria-label="جست‌وجوی شعب"/>
            </label>

            <ErrorNotice message={error}/>
            {success && <p role="status" className="warm-tint-message mb-4">{success}</p>}
            {loading ? <p className="warm-tint-message">در حال دریافت اطلاعات شعب...</p>
              : branches.length === 0 ? <p className="warm-tint-message">هنوز شعبه‌ای ثبت نشده است.</p>
              : <div className="warm-scroll" aria-label="فهرست اسکرول‌دار شعب شرکت">
                {filteredBranches.length === 0 ? <p className="p-5 text-center text-xs text-[#856c60]">شعبه‌ای با این مشخصات پیدا نشد.</p>
                  : filteredBranches.map(branch => (
                    <article key={branch.id} className="warm-record">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 flex-1 items-start gap-3">
                          <span className="warm-avatar" aria-hidden="true"><Building2 size={21}/></span>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-[#4c3129]">{branch.name}</h3>
                              <span className={`warm-badge ${branch.is_active?'warm-badge-active':'warm-badge-inactive'}`}>{branch.is_active?'فعال':'غیرفعال'}</span>
                            </div>
                            <p className="mt-1 break-words text-xs leading-6 text-[#896e60]">{branch.city||'شهر ثبت نشده'} {branch.code?` · کد ${branch.code}`:''}</p>
                            {branch.address && <p className="mt-1 break-words text-xs leading-6 text-[#896e60]">{branch.address}</p>}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center gap-2">
                          <button onClick={()=>openEdit(branch)} className="warm-outline" type="button"><Pencil size={14}/> ویرایش</button>
                          <button onClick={()=>void remove(branch)} disabled={deletingId!==null} className="warm-outline warm-danger" type="button"><Trash2 size={14}/> حذف</button>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <span className="warm-ministat"><UsersRound size={14}/>{branch.employees_count.toLocaleString('fa-IR')} کارمند</span>
                        <span className="warm-ministat"><FileText size={14}/>{branch.survey_cases_count.toLocaleString('fa-IR')} پرونده</span>
                        <span className="warm-ministat"><Upload size={14}/>{branch.import_batches_count.toLocaleString('fa-IR')} بارگذاری</span>
                      </div>
                      <Link to={`/manager/branches/${branch.id}`} className="mt-4 inline-flex items-center gap-1.5 text-xs font-black text-[#a45536] transition hover:text-[#79341f] hover:underline">مشاهده گزارش شعبه <ArrowLeft size={15}/></Link>
                    </article>
                  ))}
              </div>}
          </section>
        </div>

        {editTarget && (
          <div className="fixed inset-0 z-[80] grid place-items-center overflow-y-auto bg-[#2f1a15]/65 p-4 backdrop-blur-sm" onMouseDown={e=>{if(e.target===e.currentTarget&&!busy)setEditTarget(null)}}>
            <section role="dialog" aria-modal="true" aria-labelledby="branch-edit-title" className="warm-modal my-auto w-full max-w-lg">
              <div className="mb-5 flex items-center justify-between gap-3"><h2 id="branch-edit-title" className="text-base font-black text-[#5c3528]">ویرایش شعبه {editTarget.name}</h2><button type="button" aria-label="بستن" onClick={()=>setEditTarget(null)} className="warm-outline"><X size={18}/></button></div>
              <form onSubmit={save} className="max-h-[75vh] space-y-4 overflow-y-auto px-1">
                <Field required label="نام شعبه" value={editForm.name} onChange={e=>setEditForm(f=>({...f,name:e.target.value}))}/>
                <Field label="کد شعبه" dir="ltr" value={editForm.code} onChange={e=>setEditForm(f=>({...f,code:e.target.value}))}/>
                <Field label="شهر" value={editForm.city} onChange={e=>setEditForm(f=>({...f,city:e.target.value}))}/>
                <label className="block text-sm font-semibold">آدرس<textarea className={inputClass} rows={3} maxLength={255} value={editForm.address} onChange={e=>setEditForm(f=>({...f,address:e.target.value}))}/></label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editForm.is_active} onChange={e=>setEditForm(f=>({...f,is_active:e.target.checked}))}/> شعبه فعال باشد</label>
                <p className="warm-tint-message">غیرفعال‌سازی شعبه دارای کارمند مجاز نیست؛ ابتدا کارمندان را منتقل کنید.</p>
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
