import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  BarChart3,
  Clock3,
  FileText,
  Loader2,
  ShieldCheck,
  WalletCards,
} from 'lucide-react';

import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';

type User = {
  id: number;
  name: string;
  role: string;
};

type StatusCount = {
  id: number;
  title: string;
  color: string;
  count: number;
};

type RecentCase = {
  id: number;
  case_number: string;
  owner_full_name: string;
  created_at: string;
  status?: {
    title: string;
    color: string;
  } | null;
  priority?: {
    title: string;
    color: string;
  } | null;
};

type ActivityItem = {
  id: number;
  action: string;
  description: string;
  created_at: string;
  user?: {
    name: string;
    role: string;
  } | null;
};

type DashboardData = {
  stats: {
    total: number;
    new_today: number;
    needs_followup: number;
    active_financial_amount: string | number;
  };
  status_counts: StatusCount[];
  recent_cases: RecentCase[];
  activities: ActivityItem[];
};

const formatNumber = (value: unknown) => {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('fa-IR').format(Number.isFinite(num) ? num : 0);
};

const formatDate = (value: string) => {
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return '-';
  }
};

const actionTitle = (action: string) => {
  const map: Record<string, string> = {
    login: 'ورود به سامانه',
    case_created: 'ثبت پرونده',
    case_updated: 'ویرایش پرونده',
    case_deleted: 'حذف پرونده',
    excel_imported: 'بارگذاری اکسل',
  };

  return map[action] || action;
};

const roleTitle = (role?: string) => {
  if (role === 'admin') return 'مدیر';
  if (role === 'manager') return 'مدیر داخلی';
  if (role === 'employee') return 'کارمند';
  if (role === 'surveyor') return 'نقشه‌بردار';

  return role || 'نامشخص';
};

export default function EmployeeDashboard() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canViewFullActivities =
    currentUser?.role === 'admin' || currentUser?.role === 'manager';

  useEffect(() => {
    let mounted = true;

    Promise.all([
      api.get<DashboardData>('/dashboard'),
      api.get('/auth/me'),
    ])
      .then(([dashboardResponse, userResponse]) => {
        if (!mounted) return;

        setData(dashboardResponse.data);
        setCurrentUser(userResponse.data?.user || userResponse.data);
      })
      .catch((err) => {
        if (mounted) {
          setError(err.response?.data?.message || 'خطا در دریافت اطلاعات داشبورد');
        }
      })
      .finally(() => {
        if (mounted) {
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col justify-between gap-4 rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl shadow-slate-200 md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-black md:text-3xl">داشبورد</h1>
            <p className="mt-2 text-sm leading-7 text-slate-300">
              خلاصه وضعیت پرونده‌ها، فعالیت‌ها و آخرین اطلاعات ثبت‌شده در سامانه.
            </p>
          </div>

          <div className="flex flex-col gap-2 text-sm md:items-end">
            <div className="rounded-2xl bg-white/10 px-4 py-3 font-bold">
              امروز: {new Intl.DateTimeFormat('fa-IR').format(new Date())}
            </div>

            {currentUser && (
              <div className="text-xs text-slate-300">
                کاربر: {currentUser.name} - {roleTitle(currentUser.role)}
              </div>
            )}
          </div>
        </div>

        {loading && (
          <div className="flex min-h-64 items-center justify-center rounded-[2rem] bg-white">
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2 className="animate-spin" />
              در حال دریافت اطلاعات...
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 rounded-[2rem] border border-red-100 bg-red-50 p-5 text-red-700">
            <AlertCircle />
            {error}
          </div>
        )}

        {!loading && !error && data && (
          <>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <StatCard
                title="کل پرونده‌ها"
                value={formatNumber(data.stats.total)}
                icon={<FileText />}
                tone="bg-emerald-600 text-white"
              />
              <StatCard
                title="ثبت امروز"
                value={formatNumber(data.stats.new_today)}
                icon={<Clock3 />}
                tone="bg-blue-600 text-white"
              />
              <StatCard
                title="نیازمند پیگیری"
                value={formatNumber(data.stats.needs_followup)}
                icon={<Activity />}
                tone="bg-amber-500 text-white"
              />
              <StatCard
                title="مبلغ فعال"
                value={formatNumber(data.stats.active_financial_amount)}
                icon={<WalletCards />}
                tone="bg-slate-900 text-white"
              />
            </div>

            <div className="grid gap-6 xl:grid-cols-3">
              <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm xl:col-span-1">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="text-lg font-black text-slate-900">وضعیت پرونده‌ها</h2>
                  <BarChart3 className="text-slate-400" />
                </div>

                <div className="space-y-4">
                  {data.status_counts.map((item) => {
                    const total = Math.max(Number(data.stats.total || 0), 1);
                    const percent = Math.round((item.count / total) * 100);

                    return (
                      <div key={item.id}>
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-bold text-slate-700">{item.title}</span>
                          <span className="text-slate-500">{formatNumber(item.count)}</span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percent}%`,
                              backgroundColor: item.color || '#10b981',
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm xl:col-span-2">
                <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                  <h2 className="text-lg font-black text-slate-900">آخرین پرونده‌ها</h2>
                  <Link
                    to="/employee/cases"
                    className="rounded-2xl bg-slate-100 px-4 py-2 text-xs font-black text-slate-600 hover:bg-emerald-50 hover:text-emerald-700"
                  >
                    مشاهده لیست پرونده‌ها
                  </Link>
                </div>

                {data.recent_cases.length === 0 ? (
                  <EmptyState text="هنوز پرونده‌ای ثبت نشده است." />
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-slate-100">
                    <table className="w-full text-right text-sm">
                      <thead className="bg-slate-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3">شماره پرونده</th>
                          <th className="px-4 py-3">نام مالک</th>
                          <th className="px-4 py-3">وضعیت</th>
                          <th className="px-4 py-3">اولویت</th>
                          <th className="px-4 py-3">تاریخ ثبت</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.recent_cases.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50">
                            <td className="px-4 py-3 font-black text-slate-900">{item.case_number}</td>
                            <td className="px-4 py-3 text-slate-700">{item.owner_full_name}</td>
                            <td className="px-4 py-3">
                              <Badge
                                title={item.status?.title || 'نامشخص'}
                                color={item.status?.color || '#64748b'}
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                title={item.priority?.title || 'نامشخص'}
                                color={item.priority?.color || '#64748b'}
                              />
                            </td>
                            <td className="px-4 py-3 text-slate-500">{formatDate(item.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>

            <section className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                <div>
                  <h2 className="text-lg font-black text-slate-900">فعالیت‌های اخیر</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    نمایش آخرین فعالیت‌ها همراه با نام کاربر انجام‌دهنده.
                  </p>
                </div>

                {canViewFullActivities && (
                  <Link
                    to="/admin/activity-logs"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black text-white hover:bg-emerald-700"
                  >
                    <ShieldCheck size={16} />
                    مشاهده ۳۰ فعالیت اخیر
                  </Link>
                )}
              </div>

              {data.activities.length === 0 ? (
                <EmptyState text="هنوز فعالیتی ثبت نشده است." />
              ) : (
                <div className="space-y-3">
                  {data.activities.map((item) => (
                    <div
                      key={item.id}
                      className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{item.description}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                          <span className="rounded-full bg-emerald-50 px-3 py-1 font-black text-emerald-700">
                            توسط: {item.user?.name || 'کاربر نامشخص'}
                          </span>
                          <span className="rounded-full bg-blue-50 px-3 py-1 font-black text-blue-700">
                            {actionTitle(item.action)}
                          </span>
                          <span className="rounded-full bg-slate-100 px-3 py-1 font-black text-slate-500">
                            نقش: {roleTitle(item.user?.role)}
                          </span>
                        </div>
                      </div>

                      <div className="whitespace-nowrap text-xs font-bold text-slate-400">
                        {formatDate(item.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  tone: string;
}) {
  return (
    <div className={`rounded-[2rem] p-6 shadow-sm ${tone}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm opacity-80">{title}</div>
          <div className="mt-3 text-3xl font-black">{value}</div>
        </div>
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/15">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Badge({ title, color }: { title: string; color: string }) {
  return (
    <span
      className="inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-black text-white"
      style={{ backgroundColor: color }}
    >
      {title}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-400">
      {text}
    </div>
  );
}
