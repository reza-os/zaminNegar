import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Edit3, FilePlus2, Loader2, Search, Trash2 } from 'lucide-react';

import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';

type User = {
  id: number;
  name: string;
  role: string;
};

type CaseItem = {
  id: number;
  case_number: string;
  owner_full_name: string;
  national_code?: string | null;
  phone?: string | null;
  village_name?: string | null;
  file_location?: string | null;
  archive_code?: string | null;
  created_at: string;
  status?: { title: string; color: string } | null;
  stage?: { title: string; color: string } | null;
  priority?: { title: string; color: string } | null;
};

type Meta = {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from?: number | null;
  to?: number | null;
  has_more: boolean;
};

const emptyMeta: Meta = {
  current_page: 1,
  last_page: 1,
  per_page: 25,
  total: 0,
  from: null,
  to: null,
  has_more: false,
};

function normalizeResponse(responseData: any): { items: CaseItem[]; meta: Meta } {
  if (Array.isArray(responseData)) {
    return {
      items: responseData,
      meta: {
        ...emptyMeta,
        total: responseData.length,
        to: responseData.length,
      },
    };
  }

  const items = Array.isArray(responseData?.data) ? responseData.data : [];
  const meta = responseData?.meta || {};

  return {
    items,
    meta: {
      current_page: Number(meta.current_page || 1),
      last_page: Number(meta.last_page || 1),
      per_page: Number(meta.per_page || 25),
      total: Number(meta.total || items.length),
      from: meta.from ?? null,
      to: meta.to ?? items.length,
      has_more: Boolean(meta.has_more ?? Number(meta.current_page || 1) < Number(meta.last_page || 1)),
    },
  };
}

const formatNumber = (value: number) => new Intl.NumberFormat('fa-IR').format(value);

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

export default function CaseListPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cases, setCases] = useState<CaseItem[]>([]);
  const [meta, setMeta] = useState<Meta>(emptyMeta);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const canDelete = currentUser?.role === 'admin' || currentUser?.role === 'manager';

  useEffect(() => {
    api
      .get('/auth/me')
      .then((response) => {
        setCurrentUser(response.data?.user || response.data);
      })
      .catch(() => {
        setCurrentUser(null);
      });
  }, []);

  const fetchCases = useCallback(
    async (page = 1, append = false) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoading(true);
        setCases([]);
      }

      setError('');

      try {
        const response = await api.get('/survey-cases', {
          params: {
            page,
            per_page: 25,
            search: activeSearch || undefined,
          },
        });

        const normalized = normalizeResponse(response.data);

        setCases((previous) => {
          if (!append) {
            return normalized.items;
          }

          const map = new Map<number, CaseItem>();

          previous.forEach((item) => map.set(item.id, item));
          normalized.items.forEach((item) => map.set(item.id, item));

          return Array.from(map.values());
        });

        setMeta(normalized.meta);
      } catch (err: any) {
        setError(err.response?.data?.message || 'خطا در دریافت لیست پرونده‌ها');
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [activeSearch],
  );

  useEffect(() => {
    fetchCases(1, false);
  }, [fetchCases]);

  const handleSearch = (event: FormEvent) => {
    event.preventDefault();
    setActiveSearch(searchInput.trim());
  };

  const clearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
  };

  const deleteCase = async (item: CaseItem) => {
    if (!canDelete) {
      setError('شما اجازه حذف پرونده را ندارید.');
      return;
    }

    const confirmed = window.confirm(
      `آیا از حذف پرونده «${item.case_number} - ${item.owner_full_name}» مطمئن هستید؟`
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);
    setError('');

    try {
      await api.delete(`/survey-cases/${item.id}`);

      setCases((previous) => previous.filter((caseItem) => caseItem.id !== item.id));
      setMeta((previous) => ({
        ...previous,
        total: Math.max(previous.total - 1, 0),
      }));
    } catch (err: any) {
      setError(err.response?.data?.message || 'خطا در حذف پرونده');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col justify-between gap-4 rounded-[2rem] bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900">لیست پرونده‌ها</h1>
            <p className="mt-2 text-sm text-slate-500">
              مشاهده، جستجو و ویرایش پرونده‌های ثبت‌شده.
            </p>
          </div>

          <Link
            to="/employee/cases/create"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700"
          >
            <FilePlus2 size={18} />
            ثبت پرونده جدید
          </Link>
        </div>

        <form onSubmit={handleSearch} className="rounded-[2rem] bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
              <input
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="جستجو بر اساس شماره پرونده، نام، کد ملی، روستا، محل پرونده یا شماره تماس..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-4 pr-12 pl-4 text-sm outline-none focus:border-emerald-400 focus:bg-white"
              />
            </div>

            <button
              type="submit"
              className="rounded-2xl bg-slate-900 px-6 py-4 text-sm font-black text-white hover:bg-emerald-700"
            >
              جستجو
            </button>

            {activeSearch && (
              <button
                type="button"
                onClick={clearSearch}
                className="rounded-2xl border border-slate-200 px-6 py-4 text-sm font-black text-slate-600 hover:border-red-200 hover:text-red-600"
              >
                حذف جستجو
              </button>
            )}
          </div>
        </form>

        <div className="flex flex-col justify-between gap-3 rounded-[2rem] bg-slate-950 p-5 text-white md:flex-row md:items-center">
          <div className="font-black">
            مجموع پرونده‌ها: {formatNumber(meta.total)}
          </div>
          <div className="text-sm text-slate-300">
            نمایش داده شده: {formatNumber(cases.length)} پرونده
          </div>
        </div>

        {error && (
          <div className="rounded-[2rem] border border-red-100 bg-red-50 p-5 text-sm font-bold text-red-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex min-h-64 items-center justify-center rounded-[2rem] bg-white">
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2 className="animate-spin" />
              در حال دریافت پرونده‌ها...
            </div>
          </div>
        )}

        {!loading && (
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-sm">
            {cases.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-lg font-black text-slate-700">پرونده‌ای برای نمایش وجود ندارد</div>
                <div className="mt-2 text-sm text-slate-400">
                  اگر جستجو فعال است، عبارت جستجو را تغییر بده.
                </div>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1400px] text-right text-sm">
                    <thead className="bg-slate-50 text-slate-500">
                      <tr>
                        <th className="px-5 py-4">شماره پرونده</th>
                        <th className="px-5 py-4">نام و نام خانوادگی</th>
                        <th className="px-5 py-4">کد ملی</th>
                        <th className="px-5 py-4">شماره تماس</th>
                        <th className="px-5 py-4">روستا</th>
                        <th className="px-5 py-4">محل پرونده</th>
                        <th className="px-5 py-4">وضعیت</th>
                        <th className="px-5 py-4">مرحله</th>
                        <th className="px-5 py-4">اولویت</th>
                        <th className="px-5 py-4">تاریخ ثبت</th>
                        <th className="w-[190px] px-5 py-4">عملیات</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {cases.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="px-5 py-4 font-black text-slate-900">{item.case_number}</td>
                          <td className="px-5 py-4 text-slate-700">{item.owner_full_name}</td>
                          <td className="px-5 py-4 text-slate-500">{item.national_code || '-'}</td>
                          <td className="px-5 py-4 text-slate-500">{item.phone || '-'}</td>
                          <td className="px-5 py-4 text-slate-500">{item.village_name || '-'}</td>
                          <td className="max-w-[260px] truncate px-5 py-4 text-slate-500">
                            {item.file_location || '-'}
                          </td>
                          <td className="px-5 py-4">
                            <Badge title={item.status?.title || 'نامشخص'} color={item.status?.color || '#64748b'} />
                          </td>
                          <td className="px-5 py-4">
                            <Badge title={item.stage?.title || 'نامشخص'} color={item.stage?.color || '#64748b'} />
                          </td>
                          <td className="px-5 py-4">
                            <Badge title={item.priority?.title || 'نامشخص'} color={item.priority?.color || '#64748b'} />
                          </td>
                          <td className="px-5 py-4 text-slate-500">{formatDate(item.created_at)}</td>
                          <td className="w-[190px] px-5 py-4 align-middle">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                to={`/employee/cases/${item.id}/edit`}
                                className="inline-flex min-w-[72px] items-center justify-center gap-1 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-black text-blue-700 hover:bg-blue-100"
                              >
                                <Edit3 size={15} />
                                ویرایش
                              </Link>

                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => deleteCase(item)}
                                  disabled={deletingId === item.id}
                                  className="inline-flex min-w-[64px] items-center justify-center gap-1 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-black text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {deletingId === item.id ? (
                                    <Loader2 size={15} className="animate-spin" />
                                  ) : (
                                    <Trash2 size={15} />
                                  )}
                                  حذف
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 p-5 md:flex-row">
                  <div className="text-sm font-bold text-slate-500">
                    {formatNumber(cases.length)} پرونده از {formatNumber(meta.total)} پرونده نمایش داده شده
                  </div>

                  {meta.has_more ? (
                    <button
                      type="button"
                      onClick={() => fetchCases(meta.current_page + 1, true)}
                      disabled={loadingMore}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-7 py-3 text-sm font-black text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {loadingMore && <Loader2 size={18} className="animate-spin" />}
                      نمایش بیشتر
                    </button>
                  ) : (
                    <div className="rounded-2xl bg-slate-100 px-5 py-3 text-sm font-black text-slate-500">
                      همه پرونده‌ها نمایش داده شد
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
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
