import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import type { LookupItem } from '../../api/types';

export default function CaseCreatePage() {
  const navigate = useNavigate();
  const [lookups, setLookups] = useState<LookupItem[]>([]);
  const [form, setForm] = useState<any>({ owner_full_name: '', case_number: '', national_code: '', phone: '', village_name: '', contract_amount: 0, received_amount: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => { api.get('/lookups').then((res) => setLookups(res.data.data)); }, []);

  function group(key: string) { return lookups.filter((x) => x.group_key === key); }
  function set(key: string, value: any) { setForm((prev: any) => ({ ...prev, [key]: value })); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/survey-cases', form);
      navigate('/employee/cases');
    } finally { setSaving(false); }
  }

  return (
    <DashboardLayout>
      <form onSubmit={submit} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
        <h1 className="mb-6 text-xl font-bold text-slate-800">ثبت پرونده جدید</h1>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Input label="شماره پرونده" value={form.case_number} onChange={(v) => set('case_number', v)} />
          <Input label="نام و نام خانوادگی" required value={form.owner_full_name} onChange={(v) => set('owner_full_name', v)} />
          <Input label="نام پدر" value={form.father_name} onChange={(v) => set('father_name', v)} />
          <Input label="کد ملی" value={form.national_code} onChange={(v) => set('national_code', v)} />
          <Input label="شماره تماس" value={form.phone} onChange={(v) => set('phone', v)} />
          <Input label="نام روستا" value={form.village_name} onChange={(v) => set('village_name', v)} />
          <Select label="وضعیت پرونده" value={form.status_id} options={group('case_status')} onChange={(v) => set('status_id', v)} />
          <Select label="مرحله فعلی" value={form.stage_id} options={group('case_stage')} onChange={(v) => set('stage_id', v)} />
          <Select label="اولویت" value={form.priority_id} options={group('priority')} onChange={(v) => set('priority_id', v)} />
          <Input label="مبلغ قرارداد" type="number" value={form.contract_amount} onChange={(v) => set('contract_amount', v)} />
          <Input label="مبلغ دریافتی" type="number" value={form.received_amount} onChange={(v) => set('received_amount', v)} />
          <Input label="کد بایگانی" value={form.archive_code} onChange={(v) => set('archive_code', v)} />
        </div>
        <label className="mt-4 block text-sm font-medium text-slate-600">توضیحات</label>
        <textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} className="mt-2 min-h-28 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" />
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={() => navigate(-1)} className="rounded-xl bg-slate-100 px-5 py-3 text-slate-700">انصراف</button>
          <button disabled={saving} className="rounded-xl bg-blue-600 px-6 py-3 font-bold text-white disabled:opacity-60">{saving ? 'در حال ذخیره...' : 'ثبت پرونده'}</button>
        </div>
      </form>
    </DashboardLayout>
  );
}

function Input({ label, value, onChange, type = 'text', required = false }: any) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-600">{label}</span><input required={required} type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400" /></label>;
}

function Select({ label, value, options, onChange }: any) {
  return <label className="block"><span className="mb-2 block text-sm font-medium text-slate-600">{label}</span><select value={value || ''} onChange={(e) => onChange(e.target.value || null)} className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-400"><option value="">انتخاب کنید</option>{options.map((o: LookupItem) => <option key={o.id} value={o.id}>{o.title}</option>)}</select></label>;
}
