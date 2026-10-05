import { useEffect, useState } from 'react';
import { Activity, ArrowRight, Loader2, ShieldAlert } from 'lucide-react';
import { Link } from 'react-router-dom';

import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';

type ActivityItem = {
  id: number;
  action: string;
  description: string;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
  user?: {
    id: number;
    name: string;
    role: string;
  } | null;
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

const roleTitle = (role?: string) => {
  if (role === 'admin') return 'مدیر';
  if (role === 'manager') return 'مدیر داخلی';
  if (role === 'employee') return 'کارمند';
  if (role === 'surveyor') return 'نقشه‌بردار';

  return role || 'نامشخص';
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

export default function ActivityLogPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get('/activity-logs', {
        params: {
          limit: 30,
        },
      })
      .then((response) => {
        setActivities(response.data?.data || []);
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'خطا در دریافت فعالیت‌ها');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col justify-between gap-4 rounded-[2rem] bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900">۳۰ فعالیت اخیر سامانه</h1>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              این صفحه مخصوص مدیر است و نشان می‌دهد چه کسی، چه کاری، در چه زمانی انجام داده است.
            </p>
          </div>

          <Link
            to="/employee/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
          >
            <ArrowRight size={18} />
            بازگشت به داشبورد
          </Link>
        </div>

        {loading && (
          <div className="flex min-h-64 items-center justify-center rounded-[2rem] bg-white">
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2 className="animate-spin" />
              در حال دریافت فعالیت‌ها...
            </div>
          </div>
        )}

        {!loading && error && (
          <div className="flex items-center gap-3 rounded-[2rem] border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
            <ShieldAlert />
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
            {activities.length === 0 ? (
              <div className="p-12 text-center text-sm font-bold text-slate-400">
                هنوز فعالیتی ثبت نشده است.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px] text-right text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-5 py-4">کاربر</th>
                      <th className="px-5 py-4">نقش</th>
                      <th className="px-5 py-4">نوع فعالیت</th>
                      <th className="px-5 py-4">شرح فعالیت</th>
                      <th className="px-5 py-4">IP</th>
                      <th className="px-5 py-4">زمان</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {activities.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                              <Activity size={18} />
                            </div>
                            <div>
                              <div className="font-black text-slate-900">
                                {item.user?.name || 'کاربر نامشخص'}
                              </div>
                              <div className="mt-1 text-xs text-slate-400">
                                شناسه فعالیت: {item.id}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">
                            {roleTitle(item.user?.role)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                            {actionTitle(item.action)}
                          </span>
                        </td>

                        <td className="max-w-[360px] px-5 py-4 text-slate-700">
                          {item.description}
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {item.ip_address || '-'}
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {formatDate(item.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
