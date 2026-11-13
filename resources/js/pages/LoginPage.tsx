import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { homeFor } from '../lib/roles';
import { LoginForm } from '../components/ui/login-form';
import '../components/ui/login-page.css';

export default function LoginPage() {
  const navigate = useNavigate();
  // Never prefill privileged credentials in a public login form.
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      // Keep Laravel/Sanctum authentication and the existing dashboard redirect unchanged.
      const { data } = await api.post('/auth/login', { login: login.trim(), password });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      sessionStorage.setItem('login-visit-id', String(Date.now()));
      sessionStorage.removeItem('daily-seen-for');
      navigate(homeFor(data.user?.role), { replace: true });
    } catch (err: unknown) {
      const response = err as {
        response?: { data?: { message?: string; errors?: { login?: string[] } } };
      };
      setError(response.response?.data?.errors?.login?.[0] || response.response?.data?.message || 'ورود ناموفق بود. اطلاعات را بررسی کنید.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="zn-login-page relative flex min-h-screen min-h-[100svh] w-full items-center justify-start overflow-hidden p-4 sm:p-8" dir="rtl">
      <div className="zn-login-page-shade" aria-hidden="true" />
      <div className="relative z-10 flex w-full items-center justify-start py-8 sm:pr-[4vw] lg:pr-[7vw]">
        <LoginForm
          login={login}
          password={password}
          onLoginChange={setLogin}
          onPasswordChange={setPassword}
          onSubmit={submit}
          error={error}
          loading={loading}
        />
      </div>
    </main>
  );
}
