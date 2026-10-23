import { useEffect, useState } from 'react';
import { Activity, Building2, ChevronLeft, ChevronRight, FilePlus2, Home, WalletCards, ListChecks, LogOut, Menu, Upload, UsersRound, UserPlus, Share2, X } from 'lucide-react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import DailyGreeting from '../components/DailyGreeting';
import { cachedUser, homeFor } from '../lib/roles';

const menus = {
  admin: [{ to: '/admin/managers', label: 'مدیریت منیجرها', icon: UserPlus }],
  manager: [
    { to: '/manager/dashboard', label: 'داشبورد منیجر', icon: Home },
    { to: '/manager/finance', label: 'داشبورد مالی', icon: WalletCards },
    { to: '/manager/branches', label: 'شعبه‌ها و گزارش‌ها', icon: Building2 },
    { to: '/manager/employees', label: 'مدیریت کارکنان', icon: UsersRound },
    { to: '/manager/data-access', label: 'اشتراک پرونده و اکسل', icon: Share2 },
  ],
  employee: [
    { to: '/employee/dashboard', label: 'داشبورد من', icon: Home },
    { to: '/employee/activities', label: 'فعالیت‌های من', icon: Activity },
    { to: '/employee/cases/create', label: 'ثبت پرونده جدید', icon: FilePlus2 },
    { to: '/employee/import', label: 'بارگذاری از اکسل', icon: Upload },
    { to: '/employee/cases', label: 'پرونده‌های من', icon: ListChecks },
  ],
};
const roleLabel: Record<string,string> = { admin:'ادمین اصلی', manager:'منیجر', employee:'کارکن شرکت', surveyor:'نقشه‌بردار' };
const storageKey = 'zamin-sidebar-collapsed';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = cachedUser();
  const role = user?.role === 'admin' ? 'admin' : user?.role === 'manager' ? 'manager' : 'employee';
  const nav = menus[role];
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem(storageKey) === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  function toggleCollapsed() {
    setCollapsed(v => { window.localStorage.setItem(storageKey, v ? '0' : '1'); return !v; });
  }

  async function logout() {
    try { await api.post('/auth/logout'); } catch { /* Clear the client state regardless. */ }
    localStorage.removeItem('token'); localStorage.removeItem('user');
    sessionStorage.removeItem('login-visit-id'); sessionStorage.removeItem('daily-seen-for');
    navigate('/login', { replace:true });
  }

  const links = (small: boolean) => nav.map(({ to, label, icon: Icon }) => <NavLink
    key={to} to={to} end={to === homeFor(user?.role)} title={small ? label : undefined}
    aria-label={small ? label : undefined}
    className={({isActive}) => `group relative flex min-h-12 items-center rounded-2xl py-3 text-sm font-bold transition-colors duration-200 ${small?'justify-center px-2':'gap-3 px-4'} ${isActive?'bg-emerald-400/20 text-emerald-100':'text-slate-200/80 hover:bg-white/10 hover:text-white'}`}
  ><Icon size={19} className="shrink-0"/><span className={small?'sr-only':'whitespace-nowrap'}>{label}</span></NavLink>);

  return <div className="min-h-screen bg-[#f3f7fb] text-slate-900" dir="rtl">
    {/* Desktop sidebar; width and page offset transition together. */}
    <aside className={`fixed right-0 top-0 z-40 hidden h-dvh flex-col overflow-hidden bg-[#102d43] text-white shadow-xl motion-safe:transition-[width] motion-safe:duration-300 motion-safe:ease-in-out lg:flex ${collapsed?'w-[76px]':'w-64'}`} aria-label="منوی کناری">
      <div className={`flex min-h-[116px] flex-col border-b border-white/10 ${collapsed?'items-center px-2 pt-5':'px-5 pt-6'}`}>
        <div className="flex w-full items-center justify-between gap-2">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-400/15 text-emerald-300"><Building2 size={23}/></div>
          {!collapsed&&<button type="button" onClick={toggleCollapsed} aria-label="جمع کردن سایدبار" aria-expanded={!collapsed} className="rounded-xl p-2 text-slate-200 hover:bg-white/10"><ChevronRight size={20}/></button>}
        </div>
        {collapsed?<button type="button" onClick={toggleCollapsed} aria-label="باز کردن سایدبار" aria-expanded={!collapsed} className="mt-3 rounded-xl p-1 text-slate-200 hover:bg-white/10"><ChevronLeft size={19}/></button>:<p className="mt-3 truncate text-xs text-white/70">سامانه زمین‌نگار · {roleLabel[user?.role||'employee']}</p>}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-hidden p-3" aria-label="دسترسی‌های اصلی">{links(collapsed)}</nav>
      <div className={`mb-4 border-t border-white/10 px-3 pt-3 text-xs text-white/55 ${collapsed?'text-center':''}`}>{collapsed?'ZN':'زمین‌نگار'}</div>
    </aside>

    {/* Mobile drawer */}
    {mobileOpen&&<div className="fixed inset-0 z-40 bg-slate-950/55 lg:hidden" onClick={()=>setMobileOpen(false)} aria-hidden="true"/>}
    <aside className={`fixed right-0 top-0 z-50 flex h-dvh w-[min(84vw,300px)] flex-col bg-[#102d43] p-4 text-white shadow-2xl transition-transform duration-300 ease-out lg:hidden ${mobileOpen?'translate-x-0':'translate-x-full'}`} aria-label="منوی موبایل" aria-hidden={!mobileOpen}>
      <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4"><span className="font-black">سامانه زمین‌نگار</span><button type="button" onClick={()=>setMobileOpen(false)} aria-label="بستن منو" className="rounded-xl p-2 hover:bg-white/10"><X size={20}/></button></div>
      <nav className="space-y-1">{links(false)}</nav>
    </aside>

    <div className={`min-h-screen motion-safe:transition-[margin] motion-safe:duration-300 motion-safe:ease-in-out ${collapsed?'lg:mr-[76px]':'lg:mr-64'}`}>
      <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
        <div className="flex min-h-16 items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3"><button type="button" aria-label="باز کردن منوی موبایل" onClick={()=>setMobileOpen(true)} className="rounded-xl border border-slate-200 p-2 lg:hidden"><Menu size={20}/></button><div><p className="text-sm font-black">{user?.name||'کاربر'}</p><p className="mt-0.5 text-xs text-slate-500">{roleLabel[user?.role||'employee']}</p></div></div>
          <button type="button" onClick={()=>void logout()} aria-label="خروج از سامانه" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-rose-50 hover:text-rose-700"><LogOut size={17}/> خروج</button>
        </div>
      </header>
      <main className="mx-auto max-w-7xl min-w-0 px-4 py-6 sm:px-6 lg:py-9">{children}</main>
    </div>
    <DailyGreeting />
  </div>;
}
