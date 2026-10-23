import * as React from 'react';
import { Activity, Building2, CalendarDays, FileCheck2, FileClock, FileText, RefreshCw, Upload, UsersRound } from 'lucide-react';
import type { Analytics, StatusGroup } from './analytics-types';
import { dateFa, dateTimeFa, fmt } from './analytics-types';

const COLORS = ['#fb7185', '#60a5fa', '#4ade80', '#fbbf24', '#a78bfa', '#2dd4bf', '#fb923c', '#94a3b8', '#f472b6'];
const card = 'relative min-w-0 border-[3px] border-slate-950 bg-white p-4 shadow-[6px_6px_0_0_#0f172a] sm:p-6';
const sectionHeading = 'mb-5 border-b-[3px] border-slate-950 pb-3 text-base font-black text-slate-950 sm:text-lg';

export function MetricTiles({ analytics, compact = false }: { analytics: Analytics; compact?: boolean }) {
  const { summary: s } = analytics;
  const metrics = [
    { label: 'کل پرونده‌ها', n: s.total_cases, Icon: FileText, tone: 'bg-rose-300' },
    { label: 'ثبت امروز', n: s.created_today, Icon: FileCheck2, tone: 'bg-sky-300' },
    { label: 'ثبت این ماه', n: s.created_month, Icon: CalendarDays, tone: 'bg-emerald-300' },
    { label: 'پیگیری سررسیدشده', n: s.due_followups, Icon: FileClock, tone: 'bg-amber-300' },
    { label: 'بارگذاری‌های اکسل', n: s.import_batches, Icon: Upload, tone: 'bg-violet-300' },
    { label: 'فعالیت‌های ثبت‌شده', n: s.activities, Icon: Activity, tone: 'bg-orange-300' },
    { label: 'اقدامات پرونده', n: s.case_actions, Icon: RefreshCw, tone: 'bg-cyan-300' },
    { label: 'ردیف‌های موفق اکسل', n: s.imported_rows, Icon: FileCheck2, tone: 'bg-lime-300' },
    ...(!compact || analytics.scope === 'branch' ? [
      { label: 'کارمندان فعلی شعبه', n: s.employees, Icon: UsersRound, tone: 'bg-pink-300' },
    ] : []),
    ...(!compact ? [
      { label: 'شعبه‌های موجود', n: s.branches, Icon: Building2, tone: 'bg-slate-300' },
    ] : []),
  ];
  return <div className={`grid min-w-0 grid-cols-2 gap-4 ${compact ? 'xl:grid-cols-4' : 'md:grid-cols-3 xl:grid-cols-5'}`}>
    {metrics.map(({ label, n, Icon, tone }) => <div key={label} className={`${card} !p-3 sm:!p-4`}>
      <div className={`mb-3 grid h-9 w-9 place-items-center border-2 border-slate-950 ${tone}`}><Icon size={18} strokeWidth={2.5}/></div>
      <div className="text-[11px] font-semibold leading-6 text-slate-600 sm:text-xs">{label}</div>
      <div className="mt-1 text-xl font-black tabular-nums text-slate-950 sm:text-2xl">{fmt(n)}</div>
    </div>)}
  </div>;
}

export function WeeklyBars({ analytics, small = false }: { analytics: Analytics; small?: boolean }) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const peak = Math.max(1, ...analytics.weekly.map(d => d.count));
  return <section className={`${card} flex flex-col ${small ? 'min-h-[250px]' : 'min-h-[360px]'}`} aria-label="نمودار پرونده‌های هفت روز اخیر">
    <h3 className={sectionHeading}>پرونده‌های ثبت‌شده در ۷ روز اخیر</h3>
    <div className="flex min-h-[160px] flex-1 items-end gap-2 pb-1 pt-6 sm:gap-3" dir="ltr">
      {analytics.weekly.map((d, i) => <div key={d.date} className="group relative flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
        <div className={`relative w-full min-w-0 border-[2px] border-slate-950 transition-[height,filter] duration-500 ease-out ${['bg-red-300','bg-blue-300','bg-green-300','bg-amber-300','bg-purple-300','bg-cyan-300','bg-pink-300'][i]}`}
          style={{ height: `${Math.max(4, d.count / peak * 100)}%` }} title={`${dateFa(d.date)}: ${fmt(d.count)} پرونده`}>
          <span className="pointer-events-none absolute inset-0 opacity-10 [background-image:radial-gradient(#000_1px,transparent_1px)] [background-size:5px_5px]"/>
          {(hovered === i || !small) && <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-black text-slate-950">{fmt(d.count)}</span>}
        </div>
        <div className="h-5 whitespace-nowrap text-[10px] font-bold text-slate-700 sm:text-xs" dir="rtl">{dateFa(d.date)}</div>
      </div>)}
    </div>
  </section>;
}

function point(value: number, index: number, count: number, radius = 77) {
  const theta = 2 * Math.PI * index / count - Math.PI / 2;
  return [100 + Math.cos(theta) * (value / 100) * radius, 100 + Math.sin(theta) * (value / 100) * radius];
}
export function RadarSummary({ analytics }: { analytics: Analytics }) {
  const metrics = analytics.radar;
  const n = metrics.length;
  const points = metrics.map((d, i) => point(d.value, i, n).join(',')).join(' ');
  return <section className={`${card} min-h-[360px]`}>
    <h3 className={sectionHeading}>شاخص‌های نسبی پرونده‌ها</h3>
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <svg viewBox="0 0 200 200" className="mx-auto aspect-square w-full max-w-[260px] flex-1 overflow-visible" role="img" aria-label="نمودار راداری شاخص‌های پرونده">
        {[25,50,75,100].map(level => <polygon key={level} fill="none" stroke="#cbd5e1" strokeDasharray="4 3" strokeWidth="1.5" points={metrics.map((_, i) => point(level,i,n).join(',')).join(' ')}/>)}
        {metrics.map((_, i) => {const [x,y] = point(100,i,n); return <line key={i} x1="100" y1="100" x2={x} y2={y} stroke="#cbd5e1" strokeWidth="1.5"/>;})}
        <polygon points={points} fill="rgba(167,139,250,.5)" stroke="#0f172a" strokeWidth="3" strokeLinejoin="round"/>
        {metrics.map((m, i) => {const [x,y] = point(m.value,i,n);return <circle key={m.label} cx={x} cy={y} r="5" fill={COLORS[i]} stroke="#0f172a" strokeWidth="2"><title>{m.label}: {fmt(m.value)}٪</title></circle>;})}
      </svg>
      <div className="w-full flex-1 space-y-2 sm:max-w-[180px]">
        {metrics.map((metric, i) => <div key={metric.label} className="flex items-center justify-between gap-2 border-2 border-transparent px-1.5 py-2 text-xs hover:border-slate-950 hover:bg-slate-100">
          <div className="flex items-center gap-2"><span className="h-3 w-3 shrink-0 border border-slate-950" style={{ backgroundColor: COLORS[i] }}/><span className="font-bold">{metric.label}</span></div>
          <b className="tabular-nums">{fmt(metric.value)}٪</b>
        </div>)}
      </div>
    </div>
    <p className="mt-4 text-[11px] leading-6 text-slate-500">هر محور درصد یک شاخص مستقل است؛ «سررسید پیگیری» لزوماً شاخص مثبت نیست. درصد دریافتی بر اساس مبلغ قراردادها محاسبه شده است.</p>
  </section>;
}

export function StatusDonut({ group, small = false }: { group: StatusGroup; small?: boolean }) {
  const [hovered, setHovered] = React.useState<number | null>(null);
  const slices = group.items.filter(x => x.count > 0);
  const total = group.total;
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return <section className={`${card} ${small ? 'min-h-[250px]' : 'min-h-[360px]'}`}>
    <h3 className={sectionHeading}>توزیع {group.label}</h3>
    <div className="flex flex-col items-center gap-5 sm:flex-row">
      <div className="relative mx-auto aspect-square w-full max-w-[235px] shrink-0 sm:w-[56%]">
        <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label={`نمودار حلقه‌ای ${group.label}`}>
          <circle cx="100" cy="100" r={radius} fill="none" stroke="#e2e8f0" strokeWidth="28"/>
          {slices.map((item, i) => {
            const length = total > 0 ? item.count / total * circumference : 0;
            const currentOffset = offset;
            offset += length;
            return <circle key={item.id} cx="100" cy="100" r={radius} fill="none" stroke={COLORS[i % COLORS.length]} strokeWidth={hovered === i ? 34 : 28}
              strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-currentOffset} transform="rotate(-90 100 100)"
              className="cursor-pointer transition-[stroke-width,opacity] duration-200" onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              <title>{item.label}: {fmt(item.count)}</title>
            </circle>;
          })}
          <text x="100" y="99" textAnchor="middle" className="fill-slate-950 text-[25px] font-black">{fmt(hovered !== null ? slices[hovered]?.count ?? total : total)}</text>
          <text x="100" y="120" textAnchor="middle" className="fill-slate-500 text-[10px]">{hovered !== null ? 'این وضعیت' : 'کل پرونده‌ها'}</text>
        </svg>
      </div>
      <div className="max-h-56 w-full flex-1 space-y-1.5 overflow-y-auto pr-1 [scrollbar-gutter:stable]">
        {group.items.map((s,i) => <div key={`${s.id}-${i}`} className={`flex justify-between gap-3 border-2 px-2 py-2 text-xs ${hovered === i ? 'border-slate-950 bg-slate-100' : 'border-transparent'}`} onMouseEnter={() => setHovered(slices.findIndex(a => a.id === s.id))} onMouseLeave={() => setHovered(null)}>
          <span className="flex min-w-0 items-center gap-2"><span className="h-3 w-3 shrink-0 border border-slate-900" style={{ backgroundColor: COLORS[Math.max(0,slices.findIndex(a => a.id === s.id)) % COLORS.length] }}/><span className="truncate">{s.label}</span></span>
          <b>{fmt(s.count)}</b>
        </div>)}
      </div>
    </div>
    {!total && <p className="mt-4 text-center text-xs text-slate-500">هنوز پرونده‌ای ثبت نشده است.</p>}
  </section>;
}

export function OtherStatuses({ analytics }: { analytics: Analytics }) {
  return <section className={card}>
    <h3 className={sectionHeading}>تفکیک سایر وضعیت‌های پرونده</h3>
    <div className="grid gap-4 md:grid-cols-2">
      {analytics.status_groups.filter(g => g.key !== 'case_status').map(group => <div key={group.key} className="min-w-0 border-2 border-slate-900 bg-slate-50 p-4">
        <h4 className="mb-3 text-sm font-black">{group.label}</h4>
        <div className="max-h-40 space-y-2 overflow-y-auto overscroll-contain">
          {group.items.map(item => <div key={String(item.id)} className="flex justify-between gap-3 text-xs"><span className="min-w-0 truncate">{item.label}</span><b>{fmt(item.count)}</b></div>)}
        </div>
      </div>)}
    </div>
  </section>;
}

export function RecentLists({ analytics }: { analytics: Analytics }) {
  return <div className="grid gap-5 lg:grid-cols-2">
    <section className={card}><h3 className={sectionHeading}>آخرین پرونده‌ها</h3>
      <div className="max-h-[310px] space-y-2 overflow-y-auto overscroll-contain">
        {analytics.recent_cases.map(item => <div key={item.id} className="flex items-start justify-between gap-3 border-2 border-slate-200 bg-slate-50 p-3 text-xs">
          <div className="min-w-0"><div className="truncate font-bold">{item.owner_full_name}</div><div className="mt-1 text-slate-500">{item.status?.title || 'بدون وضعیت'} · {dateTimeFa(item.created_at)}</div></div>
          <span className="shrink-0 font-mono" dir="ltr">{item.case_number || `#${item.id}`}</span>
        </div>)}
        {!analytics.recent_cases.length && <p className="text-xs text-slate-500">پرونده‌ای ثبت نشده است.</p>}
      </div>
    </section>
    <section className={card}><h3 className={sectionHeading}>آخرین فعالیت‌ها</h3>
      <div className="max-h-[310px] space-y-2 overflow-y-auto overscroll-contain">
        {analytics.recent_activities.map(item => <div key={item.id} className="border-2 border-slate-200 bg-slate-50 p-3 text-xs">
          <div className="flex justify-between gap-2"><b>{item.user?.name || 'کاربر سابق'}</b><span className="text-slate-500">{dateTimeFa(item.created_at)}</span></div>
          <p className="mt-1 break-words text-slate-700">{item.description || item.action}</p>
        </div>)}
        {!analytics.recent_activities.length && <p className="text-xs text-slate-500">فعالیتی ثبت نشده است.</p>}
      </div>
    </section>
  </div>;
}

export function AnalyticsBento({ analytics }: { analytics: Analytics }) {
  const primary = analytics.status_groups.find(g => g.key === 'case_status');
  return <div className="space-y-7">
    <MetricTiles analytics={analytics}/>
    <div className="grid min-w-0 gap-6 xl:grid-cols-2">
      <div className="flex min-w-0 flex-col gap-6"><WeeklyBars analytics={analytics}/><RadarSummary analytics={analytics}/></div>
      {primary && <StatusDonut group={primary}/>} 
    </div>
    <OtherStatuses analytics={analytics}/>
    <RecentLists analytics={analytics}/>
  </div>;
}
