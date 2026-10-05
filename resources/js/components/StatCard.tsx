export default function StatCard({ title, value, icon, tone = 'blue' }: { title: string; value: string | number; icon: React.ReactNode; tone?: 'blue' | 'green' | 'orange' | 'red' }) {
  const tones: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    orange: 'bg-amber-50 text-amber-600 border-amber-100',
    red: 'bg-red-50 text-red-600 border-red-100',
  };

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${tones[tone]}`}>
      <div className="mb-4 flex items-center justify-between">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white shadow-sm">{icon}</div>
      </div>
      <p className="text-sm text-slate-500">{title}</p>
      <strong className="mt-2 block text-3xl text-slate-800">{value}</strong>
      <p className="mt-3 text-xs text-emerald-600">نسبت به ماه قبل ↑</p>
    </div>
  );
}
