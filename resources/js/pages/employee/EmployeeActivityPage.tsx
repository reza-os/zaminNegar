import { useEffect, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import { errorMessage } from '../../lib/roles';

type ActivityItem = {
  id: number;
  action: string;
  description: string | null;
  created_at: string;
};
type Response = {
  data: ActivityItem[];
  current_page: number;
  last_page: number;
  total: number;
};

const actionLabels: Record<string, string> = {
  login: 'ورود به سامانه',
  case_created: 'ثبت پرونده',
  case_updated: 'ویرایش پرونده',
  excel_imported: 'بارگذاری اکسل',
};

export default function EmployeeActivityPage() {
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Response | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.get<Response>(`/my-activities?page=${page}`)
      .then(({ data }) => { if (active) setResult(data); })
      .catch((err: unknown) => { if (active) setError(errorMessage(err)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [page]);

  const navigate = (nextPage: number) => {
    if (loading) return;
    setLoading(true);
    setError('');
    setPage(nextPage);
  };

  return (
    <DashboardLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-950">فعالیت‌های من</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          تاریخچه فعالیت‌های حساب خودتان، بدون دسترسی به فعالیت همکاران شعبه.
        </p>
      </div>
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 sm:p-7">
        {loading && <p className="text-sm text-slate-500">در حال دریافت سوابق...</p>}
        {error && <p role="alert" className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {!loading && result && (
          <>
            <p className="mb-5 text-xs text-slate-500">تعداد کل فعالیت‌ها: {result.total.toLocaleString('fa-IR')}</p>
            <div className="space-y-3">
              {result.data.map((activity) => (
                <article key={activity.id} className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">{actionLabels[activity.action] || activity.action}</h2>
                    <p className="mt-1 text-sm leading-7 text-slate-600">{activity.description || 'بدون توضیح'}</p>
                  </div>
                  <time className="text-xs text-slate-500" dateTime={activity.created_at}>
                    {new Date(activity.created_at).toLocaleString('fa-IR')}
                  </time>
                </article>
              ))}
              {result.data.length === 0 && <p className="py-8 text-center text-sm text-slate-500">هنوز فعالیتی ثبت نشده است.</p>}
            </div>
            <div className="mt-6 flex items-center justify-center gap-4">
              <button type="button" disabled={page <= 1 || loading} onClick={() => navigate(page - 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-40">صفحه قبل</button>
              <span className="text-xs text-slate-600">{page.toLocaleString('fa-IR')} از {result.last_page.toLocaleString('fa-IR')}</span>
              <button type="button" disabled={page >= result.last_page || loading} onClick={() => navigate(page + 1)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm disabled:opacity-40">صفحه بعد</button>
            </div>
          </>
        )}
      </section>
    </DashboardLayout>
  );
}
