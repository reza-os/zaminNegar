import type { InputHTMLAttributes, ReactNode } from 'react';
export const cardClass = 'rounded-[1.7rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7';
export const inputClass = 'mt-2 block w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100';
export function Field({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<input {...rest} className={inputClass + (rest.className ? ` ${rest.className}` : '')}/></label>;
}
export function PageTitle({ title, description, children }: { title: string; description: string; children?: ReactNode }) {
  return <div className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><h1 className="text-2xl font-black tracking-tight sm:text-3xl">{title}</h1><p className="mt-3 text-sm leading-7 text-slate-500">{description}</p></div>{children}</div>;
}
export function ErrorNotice({ message }: { message: string }) {
  return message ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p> : null;
}
export function SubmitButton({ busy, children, disabled = false }: { busy: boolean; children: ReactNode; disabled?: boolean }) {
  return <button type="submit" disabled={busy || disabled} className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-50">{busy ? 'در حال ثبت...' : children}</button>;
}
