import { useEffect, useState } from 'react';
import { ArrowLeft, Building2, LayoutDashboard, LoaderCircle, RefreshCw, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import { errorMessage } from '../../lib/roles';
import BentoDashboard from '../../components/ui/bento-dashboard';
import ScopeExplorer from '../../components/manager/ScopeExplorer';
import type { Analytics } from '../../components/manager/analytics-types';

export default function ManagerDashboardPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);setError('');
    api.get<Analytics>('/manager/dashboard', { params: { scope: 'all' }, signal: controller.signal })
      .then(({data: result}) => { if (!controller.signal.aborted) setData(result); })
      .catch(err => { if (!controller.signal.aborted) setError(errorMessage(err)); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  return <DashboardLayout>
    <div className="min-w-0 space-y-10 bg-zinc-100 pb-12 font-sans text-slate-950" dir="rtl">
      <header className="flex flex-wrap items-start justify-between gap-5 border-b-4 border-slate-950 pb-6">
        <div>
          <span className="mb-3 inline-flex items-center gap-2 border-2 border-slate-950 bg-lime-300 px-3 py-1 text-xs font-black"><LayoutDashboard size={15}/> مدیریت شرکت زمین‌نگار</span>
          <h1 className="text-3xl font-black sm:text-4xl">داشبورد منیجر</h1>
          <p className="mt-3 text-xs leading-7 text-slate-600 sm:text-sm">نمای کلی پرونده‌ها، وضعیت‌ها، کارمند و عملکرد تمامی شعبه‌های شرکت</p>
        </div>
        <button type="button" onClick={() => setRefresh(c => c+1)} disabled={loading} className="flex items-center gap-2 border-[3px] border-slate-950 bg-white px-4 py-2 text-xs font-black shadow-[4px_4px_0_0_#0f172a] transition active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60"><RefreshCw size={16}/> به‌روزرسانی آمار</button>
      </header>

      <section aria-labelledby="company-overview" className="space-y-6">
        <h2 id="company-overview" className="text-xl font-black">آمار کل شرکت</h2>
        {loading && <div role="status" className="flex min-h-64 items-center justify-center gap-3 border-[3px] border-slate-950 bg-white text-sm"><LoaderCircle className="animate-spin"/>در حال دریافت آمار واقعی از سرور...</div>}
        {error && <div role="alert" className="border-[3px] border-rose-600 bg-rose-50 p-5 text-sm text-rose-700">{error}</div>}
        {data && <BentoDashboard data={data}/>} 
      </section>

      <section aria-labelledby="employee-insights" className="space-y-6 border-t-4 border-slate-950 pt-9">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="employee-insights" className="text-xl font-black sm:text-2xl">جزئیات عملکرد کارمندان</h2><p className="mt-2 text-xs text-slate-600">نام کارمند را جست‌وجو کن و پرونده‌ها، گزارش و سوابق خودش را ببین.</p></div>
          <Link to="/manager/employees" className="inline-flex items-center gap-2 text-xs font-black underline underline-offset-4"><UsersRound size={16}/> مدیریت کارمندان <ArrowLeft size={14}/></Link>
        </div>
        <ScopeExplorer kind="employee"/>
      </section>

      <section aria-labelledby="branch-insights" className="space-y-6 border-t-4 border-slate-950 pt-9">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="branch-insights" className="text-xl font-black sm:text-2xl">جزئیات عملکرد شعبه‌ها</h2><p className="mt-2 text-xs text-slate-600">هر منیجر می‌تواند همه شعبه‌ها و فعالیت‌های تجمیعی آن‌ها را مشاهده کند.</p></div>
          <Link to="/manager/branches" className="inline-flex items-center gap-2 text-xs font-black underline underline-offset-4"><Building2 size={16}/> مدیریت شعب <ArrowLeft size={14}/></Link>
        </div>
        <ScopeExplorer kind="branch"/>
      </section>
    </div>
  </DashboardLayout>;
}
