import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function LoginPage() {
  const navigate = useNavigate();
  const [login, setLogin] = useState('admin@zaminnegar.local');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { login, password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/employee/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'ورود ناموفق بود.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0f2742] to-[#1d6d8f] flex items-center justify-center p-4" dir="rtl">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-blue-600 text-white grid place-items-center text-2xl">📋</div>
          <h1 className="text-2xl font-bold text-slate-800">سیستم مدیریت پرونده‌ها</h1>
          <p className="mt-2 text-sm text-slate-500">دفتر نقشه‌برداری</p>
        </div>

        <label className="mb-2 block text-sm font-medium text-slate-600">ایمیل، نام کاربری یا موبایل</label>
        <input value={login} onChange={(e) => setLogin(e.target.value)} className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />

        <label className="mb-2 block text-sm font-medium text-slate-600">رمز عبور</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mb-4 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500" />

        {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <button disabled={loading} className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white transition hover:bg-blue-700 disabled:opacity-60">
          {loading ? 'در حال ورود...' : 'ورود به سامانه'}
        </button>
      </form>
    </main>
  );
}
