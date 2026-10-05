import { FormEvent, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Loader2, Save } from 'lucide-react';

import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';

type LookupItem = {
  id: number;
  title: string;
};

type Lookups = {
  case_status?: LookupItem[];
  case_stage?: LookupItem[];
  priority?: LookupItem[];
};

type CaseForm = {
  case_number: string;
  owner_full_name: string;
  father_name: string;
  national_code: string;
  village_name: string;
  phone: string;
  postal_code: string;
  file_location: string;
  description: string;
  status_id: string;
  stage_id: string;
  priority_id: string;
  contract_amount: string;
  received_amount: string;
  archive_code: string;
  next_action: string;
};

const initialForm: CaseForm = {
  case_number: '',
  owner_full_name: '',
  father_name: '',
  national_code: '',
  village_name: '',
  phone: '',
  postal_code: '',
  file_location: '',
  description: '',
  status_id: '',
  stage_id: '',
  priority_id: '',
  contract_amount: '0',
  received_amount: '0',
  archive_code: '',
  next_action: '',
};

export default function CaseEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState<CaseForm>(initialForm);
  const [lookups, setLookups] = useState<Lookups>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/survey-cases/${id}`),
      api.get('/lookups'),
    ])
      .then(([caseResponse, lookupResponse]) => {
        const item = caseResponse.data;

        setForm({
          case_number: item.case_number || '',
          owner_full_name: item.owner_full_name || '',
          father_name: item.father_name || '',
          national_code: item.national_code || '',
          village_name: item.village_name || '',
          phone: item.phone || '',
          postal_code: item.postal_code || '',
          file_location: item.file_location || '',
          description: item.description || '',
          status_id: item.status_id ? String(item.status_id) : '',
          stage_id: item.stage_id ? String(item.stage_id) : '',
          priority_id: item.priority_id ? String(item.priority_id) : '',
          contract_amount: item.contract_amount ? String(item.contract_amount) : '0',
          received_amount: item.received_amount ? String(item.received_amount) : '0',
          archive_code: item.archive_code || '',
          next_action: item.next_action || '',
        });

        setLookups(lookupResponse.data || {});
      })
      .catch((err) => {
        setError(err.response?.data?.message || 'خطا در دریافت اطلاعات پرونده');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  const updateField = (name: keyof CaseForm, value: string) => {
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    setSaving(true);
    setError('');

    try {
      await api.put(`/survey-cases/${id}`, {
        ...form,
        status_id: form.status_id || null,
        stage_id: form.stage_id || null,
        priority_id: form.priority_id || null,
        contract_amount: Number(form.contract_amount || 0),
        received_amount: Number(form.received_amount || 0),
      });

      navigate('/employee/cases');
    } catch (err: any) {
      const errors = err.response?.data?.errors;

      if (errors) {
        const firstError = Object.values(errors).flat()[0];
        setError(String(firstError || 'خطا در ذخیره اطلاعات'));
      } else {
        setError(err.response?.data?.message || 'خطا در ذخیره اطلاعات');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" dir="rtl">
        <div className="flex flex-col justify-between gap-4 rounded-[2rem] bg-white p-6 shadow-sm md:flex-row md:items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900">ویرایش پرونده</h1>
            <p className="mt-2 text-sm text-slate-500">اطلاعات پرونده را اصلاح و ذخیره کنید.</p>
          </div>

          <Link
            to="/employee/cases"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-5 py-3 text-sm font-black text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
          >
            <ArrowRight size={18} />
            بازگشت
          </Link>
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center rounded-[2rem] bg-white">
            <div className="flex items-center gap-3 text-slate-500">
              <Loader2 className="animate-spin" />
              در حال دریافت اطلاعات...
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6 rounded-[2rem] bg-white p-6 shadow-sm">
            {error && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-sm font-bold text-red-700">
                {error}
              </div>
            )}

            <Section title="اطلاعات اصلی">
              <Input label="شماره پرونده" value={form.case_number} onChange={(v) => updateField('case_number', v)} required />
              <Input label="نام و نام خانوادگی" value={form.owner_full_name} onChange={(v) => updateField('owner_full_name', v)} required />
              <Input label="نام پدر" value={form.father_name} onChange={(v) => updateField('father_name', v)} />
              <Input label="کد ملی" value={form.national_code} onChange={(v) => updateField('national_code', v)} />
              <Input label="نام روستا" value={form.village_name} onChange={(v) => updateField('village_name', v)} />
              <Input label="شماره تماس" value={form.phone} onChange={(v) => updateField('phone', v)} />
              <Input label="کد پستی" value={form.postal_code} onChange={(v) => updateField('postal_code', v)} />
              <Input label="کد بایگانی" value={form.archive_code} onChange={(v) => updateField('archive_code', v)} />
            </Section>

            <Section title="وضعیت و پیگیری">
              <Select label="وضعیت" value={form.status_id} options={lookups.case_status || []} onChange={(v) => updateField('status_id', v)} />
              <Select label="مرحله" value={form.stage_id} options={lookups.case_stage || []} onChange={(v) => updateField('stage_id', v)} />
              <Select label="اولویت" value={form.priority_id} options={lookups.priority || []} onChange={(v) => updateField('priority_id', v)} />
              <Input label="اقدام بعدی" value={form.next_action} onChange={(v) => updateField('next_action', v)} />
            </Section>

            <Section title="اطلاعات مالی و توضیحات">
              <Input label="مبلغ قرارداد" type="number" value={form.contract_amount} onChange={(v) => updateField('contract_amount', v)} />
              <Input label="مبلغ دریافتی" type="number" value={form.received_amount} onChange={(v) => updateField('received_amount', v)} />
              <Input label="محل قرارگیری پرونده" value={form.file_location} onChange={(v) => updateField('file_location', v)} />
              <Textarea label="توضیحات" value={form.description} onChange={(v) => updateField('description', v)} />
            </Section>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-8 py-4 text-sm font-black text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                ذخیره تغییرات
              </button>
            </div>
          </form>
        )}
      </div>
    </DashboardLayout>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-4 text-lg font-black text-slate-900">{title}</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{children}</div>
    </section>
  );
}

function Input({
  label,
  value,
  onChange,
  required = false,
  type = 'text',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:bg-white"
      />
    </label>
  );
}

function Textarea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block md:col-span-2 xl:col-span-3">
      <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
      <textarea
        value={value}
        rows={4}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:bg-white"
      />
    </label>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: LookupItem[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-black text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:bg-white"
      >
        <option value="">انتخاب نشده</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.title}
          </option>
        ))}
      </select>
    </label>
  );
}
