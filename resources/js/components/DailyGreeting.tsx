import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { api } from '../api/client';

type DailyMessage = { id: number; type: 'quote' | 'poem'; content: string; author?: string | null };

/** Only one toast per successful login, on the first protected-page visit. */
export default function DailyGreeting() {
  const [message, setMessage] = useState<DailyMessage | null>(null);
  useEffect(() => {
    const loginId = sessionStorage.getItem('login-visit-id');
    if (!loginId || sessionStorage.getItem('daily-seen-for') === loginId) return;
    let active = true;
    api.get<{ data: DailyMessage | null }>('/daily-message')
      .then(({ data }) => {
        if (!active) return;
        sessionStorage.setItem('daily-seen-for', loginId);
        if (data.data) setMessage(data.data);
      })
      .catch(() => { /* Greetings must never obstruct dashboard access. */ });
    return () => { active = false; };
  }, []);
  if (!message) return null;
  return (
    <aside className="fixed left-4 top-20 z-[90] w-[min(92vw,390px)] rounded-3xl border border-emerald-100/70 bg-white/95 p-5 text-slate-800 shadow-[0_16px_55px_-18px_rgba(2,44,34,.45)] backdrop-blur-xl" role="status" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-emerald-100 text-emerald-700"><Bell size={19} /></span>
        <div className="min-w-0 flex-1">
          <div className="mb-2 text-sm font-black">{message.type === 'poem' ? 'شعر روز' : 'جمله امروز'}</div>
          <p className="text-sm leading-8">{message.content}</p>
          {message.author && <div className="mt-2 text-xs text-slate-500">— {message.author}</div>}
        </div>
        <button type="button" aria-label="بستن پیام روز" onClick={() => setMessage(null)} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"><X size={18}/></button>
      </div>
    </aside>
  );
}
