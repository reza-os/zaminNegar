import { Bell, FilePlus2, Home, ListChecks, LogOut, Settings, Upload, UsersRound } from 'lucide-react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

const nav = [
  { to: '/employee/dashboard', label: 'داشبورد', icon: Home },
  { to: '/employee/cases/create', label: 'ثبت پرونده جدید', icon: FilePlus2 },
  { to: '/employee/import', label: 'بارگذاری از اکسل', icon: Upload },
  { to: '/employee/cases', label: 'لیست پرونده‌ها', icon: ListChecks },
  { to: '/employee/cases', label: 'مشتریان / مالکین', icon: UsersRound },
  { to: '/employee/dashboard', label: 'تنظیمات', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  async function logout() {
    try { await api.post('/auth/logout'); } catch {}
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  }

  return (
    <div className="min-h-screen bg-soft" dir="rtl">
      <aside className="fixed right-0 top-0 h-full w-64 bg-[#0f2742] text-white shadow-2xl">
        <div className="p-6 text-center border-b border-white/10">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-blue-500/20 text-2xl">📄</div>
          <h2 className="font-bold">سیستم مدیریت پرونده‌ها</h2>
          <p className="mt-1 text-xs text-blue-100/70">دفتر نقشه‌برداری</p>
        </div>
        <nav className="p-3 space-y-1">
          {nav.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink key={item.label} to={item.to} className={({ isActive }) => `flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${isActive ? 'bg-blue-600 text-white' : 'text-blue-50/80 hover:bg-white/10'}`}>
                <Icon size={18} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
      </aside>

      <div className="mr-64 min-h-screen">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-6 backdrop-blur">
          <div className="w-full max-w-lg">
            <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none focus:border-blue-400" placeholder="جستجو در پرونده‌ها..." />
          </div>
          <div className="flex items-center gap-4">
            <button className="relative rounded-full bg-slate-100 p-2 text-slate-600"><Bell size={18} /><span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white grid place-items-center">3</span></button>
            <div className="text-left">
              <div className="font-bold text-slate-700">{user.name || 'کاربر'}</div>
              <div className="text-xs text-slate-400">{user.role || 'employee'}</div>
            </div>
            <button onClick={logout} className="rounded-xl bg-slate-100 p-2 text-slate-600 hover:bg-red-50 hover:text-red-600"><LogOut size={18} /></button>
          </div>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
