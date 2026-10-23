import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { ShieldCheck, UserPlus, UsersRound } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import { errorMessage } from '../../lib/roles';
import { cardClass, ErrorNotice, Field, PageTitle, SubmitButton } from '../../components/management/Fields';

type Manager = { id: number; name: string; username: string; email: string; mobile?: string | null; created_at: string; is_active: boolean };
const empty = { name: '', username: '', email: '', mobile: '', password: '' };

export default function AdminManagersPage() {
  const [form, setForm] = useState({ ...empty });
  const [managers, setManagers] = useState<Manager[]>([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const load = useCallback(async () => {
    try { const { data } = await api.get<{ data: Manager[] }>('/admin/managers'); setManagers(data.data); }
    catch (e) { setError(errorMessage(e)); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function submit(e: FormEvent) {
    e.preventDefault(); if (busy) return;
    setError(''); setSuccess(''); setBusy(true);
    try {
      await api.post('/admin/managers', form);
      setForm({ ...empty }); setSuccess('منیجر جدید با موفقیت ایجاد شد.'); await load();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <DashboardLayout>
    <PageTitle title="مدیریت منیجرها" description="در این مرحله فقط ادمین اصلی مجاز است برای منیجرها حساب کاربری ایجاد کند." />
    <div className="grid gap-6 lg:grid-cols-[390px_1fr]">
      <section className={cardClass}>
        <h2 className="mb-5 flex items-center gap-2 text-base font-black"><UserPlus className="text-emerald-600" size={19}/> ایجاد منیجر</h2>
        <form onSubmit={submit} className="space-y-4">
          <Field required label="نام و نام خانوادگی" value={form.name} onChange={e => setForm(v => ({...v, name:e.target.value}))} maxLength={150}/>
          <Field required label="نام کاربری" dir="ltr" value={form.username} onChange={e => setForm(v => ({...v, username:e.target.value}))} maxLength={100} autoComplete="off" />
          <Field required type="email" label="ایمیل" dir="ltr" value={form.email} onChange={e => setForm(v => ({...v, email:e.target.value}))} autoComplete="off"/>
          <Field label="شماره موبایل (اختیاری)" dir="ltr" value={form.mobile} onChange={e => setForm(v => ({...v, mobile:e.target.value}))}/>
          <Field required type="password" label="رمز عبور اولیه (حداقل ۱۰ کاراکتر)" dir="ltr" minLength={10} value={form.password} onChange={e => setForm(v => ({...v, password:e.target.value}))} autoComplete="new-password"/>
          <ErrorNotice message={error} />
          {success && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
          <SubmitButton busy={busy}>ایجاد حساب منیجر</SubmitButton>
        </form>
      </section>
      <section className={cardClass}>
        <h2 className="mb-5 flex items-center gap-2 text-base font-black"><UsersRound className="text-emerald-600" size={19}/> فهرست منیجرها <span className="text-sm font-normal text-slate-400">({managers.length})</span></h2>
        {loading ? <p className="text-sm text-slate-500">در حال دریافت اطلاعات...</p> : managers.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500"><ShieldCheck className="mx-auto mb-3"/> هنوز منیجری ایجاد نشده است.</div> :
          <div className="space-y-3">{managers.map(manager => <div key={manager.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4"><div><div className="font-bold">{manager.name}</div><div className="mt-2 text-xs text-slate-500" dir="ltr">{manager.email} · {manager.username}</div></div><span className={'rounded-full px-3 py-1 text-xs ' + (manager.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500')}>{manager.is_active ? 'فعال' : 'غیرفعال'}</span></div>)}</div>}
      </section>
    </div>
  </DashboardLayout>;
}
