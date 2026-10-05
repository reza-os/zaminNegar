import { ChangeEvent, useState } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';

export default function ImportExcelPage() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  function pick(e: ChangeEvent<HTMLInputElement>) {
    setFile(e.target.files?.[0] || null);
    setResult(null);
  }

  async function upload() {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    setLoading(true);
    try {
      const { data } = await api.post('/imports', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setResult(data.data);
    } finally { setLoading(false); }
  }

  return (
    <DashboardLayout>
      <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h1 className="mb-2 text-xl font-bold text-slate-800">بارگذاری پرونده‌ها از اکسل</h1>
        <p className="mb-6 text-sm text-slate-500">فایل اکسل باید شامل ستون‌های نمونه‌ای باشد که ارسال کردید.</p>

        <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/40 p-8 text-center">
          <input type="file" accept=".xlsx,.xls,.csv" onChange={pick} className="mx-auto block" />
          {file && <p className="mt-4 text-sm text-slate-600">فایل انتخاب‌شده: {file.name}</p>}
          <button onClick={upload} disabled={!file || loading} className="mt-5 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-50">
            {loading ? 'در حال بارگذاری...' : 'شروع بارگذاری'}
          </button>
        </div>

        {result && (
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <Box label="کل ردیف‌ها" value={result.total_rows} />
            <Box label="موفق" value={result.success_rows} />
            <Box label="خطادار" value={result.failed_rows} />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function Box({ label, value }: { label: string; value: number }) {
  return <div className="rounded-2xl bg-slate-50 p-5 text-center"><p className="text-sm text-slate-500">{label}</p><strong className="mt-2 block text-3xl text-slate-800">{value ?? 0}</strong></div>;
}
