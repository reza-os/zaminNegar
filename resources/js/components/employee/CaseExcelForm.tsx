import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import '../../pages/employee/employee-warm.css';

type Field = { key: string; label: string; section: string; type?: 'date'|'number'|'textarea'|'select'; group?: string; required?: boolean; help?: string };
const fields: Field[] = [
  {key:'case_date_jalali',label:'تاریخ پرونده (شمسی)',section:'اطلاعات اصلی',help:'مثال: ۱۴۰۵/۰۷/۰۱'},
  {key:'case_number',label:'شماره پرونده',section:'اطلاعات اصلی',required:true},
  {key:'owner_full_name',label:'نام و نام خانوادگی',section:'اطلاعات اصلی',required:true},
  {key:'father_name',label:'نام پدر',section:'اطلاعات اصلی'},
  {key:'national_code',label:'کد ملی',section:'اطلاعات اصلی'},
  {key:'birth_date_jalali',label:'تاریخ تولد (شمسی)',section:'اطلاعات اصلی'},
  {key:'village_name',label:'نام روستا',section:'اطلاعات اصلی'},
  {key:'surveyor_name_raw',label:'نقشه‌بردار',section:'اطلاعات اصلی'},
  {key:'postal_code',label:'کد پستی',section:'اطلاعات اصلی'},
  {key:'phone',label:'شماره تماس',section:'اطلاعات اصلی'},
  {key:'file_location',label:'محل قرارگیری پرونده',section:'اطلاعات اصلی'},
  {key:'description',label:'توضیحات',section:'اطلاعات اصلی',type:'textarea'},
  {key:'status_id',label:'وضعیت پرونده',section:'وضعیت و پیگیری',type:'select',group:'case_status'},
  {key:'stage_id',label:'مرحله فعلی',section:'وضعیت و پیگیری',type:'select',group:'case_stage'},
  {key:'assigned_user_id',label:'مسئول پرونده',section:'وضعیت و پیگیری',type:'select',group:'people'},
  {key:'priority_id',label:'اولویت',section:'وضعیت و پیگیری',type:'select',group:'priority'},
  {key:'last_action_at_jalali',label:'تاریخ آخرین اقدام (شمسی)',section:'وضعیت و پیگیری'},
  {key:'next_action',label:'اقدام بعدی',section:'وضعیت و پیگیری'},
  {key:'next_action_at_jalali',label:'تاریخ اقدام بعدی (شمسی)',section:'وضعیت و پیگیری'},
  {key:'followup_status_id',label:'وضعیت پیگیری',section:'وضعیت و پیگیری',type:'select',group:'followup_status'},
  {key:'stop_reason_id',label:'علت توقف',section:'وضعیت و پیگیری',type:'select',group:'stop_reason'},
  {key:'contract_amount',label:'مبلغ قرارداد',section:'اطلاعات مالی',type:'number'},
  {key:'received_amount',label:'مبلغ دریافتی',section:'اطلاعات مالی',type:'number'},
  {key:'customer_source_id',label:'منبع مشتری',section:'اطلاعات مالی',type:'select',group:'customer_source'},
  {key:'financial_status_id',label:'وضعیت مالی',section:'اطلاعات مالی',type:'select',group:'financial_status'},
  {key:'physical_status_id',label:'وضعیت فیزیکی',section:'اطلاعات مالی',type:'select',group:'physical_status'},
  {key:'archive_code',label:'کد بایگانی',section:'اطلاعات مالی'},
];
const sections = ['اطلاعات اصلی','وضعیت و پیگیری','اطلاعات مالی'];
type Option = {id:number;title:string;group_key?:string;name?:string};
type FormState = Record<string,string>;
const initial = Object.fromEntries(fields.map(f=>[f.key, f.type==='number'?'0':''])) as FormState;
const faDigits = (str:string) => str.replace(/[۰-۹]/g, d=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).replace(/[٠-٩]/g,d=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export default function CaseExcelForm({id}:{id?:string}) {
  const navigate = useNavigate();
  const [form,setForm] = useState<FormState>(initial);
  const [lookups,setLookups] = useState<Option[]>([]);
  const [people,setPeople] = useState<Option[]>([]);
  const [saving,setSaving] = useState(false);
  const [loading,setLoading] = useState(Boolean(id));
  const [error,setError] = useState('');
  const [existing,setExisting] = useState<Record<string,unknown>|null>(null);
  const readOnly = Boolean(id && existing && existing.can_edit === false);
  useEffect(()=>{
    let active=true;
    Promise.all([api.get('/lookups'),api.get('/case-assignees'),...(id?[api.get(`/survey-cases/${id}`)]:[])]).then(([l,p,c])=>{
      if(!active)return;
      const source=l.data?.data??l.data;
      const list=Array.isArray(source)?source:Object.entries(source||{}).flatMap(([key,value])=>Array.isArray(value)?value.map((v:any)=>({...v,group_key:key})):[]);
      setLookups(list);setPeople(p.data?.data||[]);
      if(c){const item=c.data;setExisting(item);setForm(Object.fromEntries(fields.map(f=>[f.key,item[f.key]===null||item[f.key]===undefined?'':String(item[f.key])])));}
    }).catch(err=>active&&setError(err.response?.data?.message||'دریافت اطلاعات فرم ناموفق بود')).finally(()=>active&&setLoading(false));
    return()=>{active=false;};
  },[id]);
  const update=(key:string,value:string)=>setForm(p=>({...p,[key]:value}));
  const balance=Number(faDigits(form.contract_amount||'0'))-Number(faDigits(form.received_amount||'0'));
  async function submit(event:FormEvent){
    event.preventDefault();if(readOnly)return;setSaving(true);setError('');
    const payload:Record<string,string|number|null>={};
    for(const field of fields){const value=faDigits(form[field.key]||'').trim();payload[field.key]=!value?null:field.type==='select'?Number(value):field.type==='number'?Number(value):value;}
    try{ if(id)await api.put(`/survey-cases/${id}`,payload); else await api.post('/survey-cases',payload); navigate('/employee/cases'); }
    catch(err:any){const first=Object.values(err.response?.data?.errors||{}).flat()[0];setError(String(first||err.response?.data?.message||'ثبت اطلاعات ناموفق بود'));}
    finally{setSaving(false);}
  }
  return <DashboardLayout><div dir="rtl" className="employee-warm-page space-y-5">
    <header className="employee-hero"><div className="employee-badge-soft mb-3">فرم جامع پرونده</div><h1 className="text-2xl font-black text-[var(--ew-text)]">{readOnly?'مشاهده پرونده (فقط خواندنی)':id?'ویرایش پرونده من':'ثبت پرونده جدید'}</h1><p className="mt-2 text-sm leading-7 text-[var(--ew-muted)]">فرم مطابق ستون‌های فایل اکسل؛ ردیف، مانده و روزهای بدون اقدام به صورت خودکار محاسبه می‌شوند.</p></header>
    {loading?<div className="employee-empty">در حال بارگذاری...</div>:<form onSubmit={submit} className="space-y-5">{error&&<div role="alert" className="employee-alert">{error}</div>}{sections.map(section=><section key={section} className="employee-form-section"><h2 className="mb-6 border-b border-[var(--ew-line)] pb-3 text-base font-black text-[var(--ew-text)]">{section}</h2><div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{fields.filter(f=>f.section===section).map(field=>{const value=form[field.key]||'';return <label key={field.key} className={field.type==='textarea'?'sm:col-span-2 xl:col-span-3':'block'}><span className="employee-label">{field.label}{field.required&&' *'}</span>{field.type==='textarea'?<textarea rows={3} disabled={readOnly} className="employee-textarea mt-2" value={value} onChange={e=>update(field.key,e.target.value)}/>:field.type==='select'?<select disabled={readOnly} className="employee-select mt-2" value={value} onChange={e=>update(field.key,e.target.value)}><option value="">انتخاب نشده</option>{(field.group==='people'?people:lookups.filter(l=>l.group_key===field.group)).map(o=><option key={o.id} value={o.id}>{o.title||o.name}</option>)}</select>:<input disabled={readOnly} className="employee-input mt-2" type={field.type==='number'?'text':'text'} inputMode={field.type==='number'?'decimal':'text'} required={field.required} value={value} onChange={e=>update(field.key,e.target.value)} dir={field.type==='number'?'ltr':undefined}/>} {field.help&&<small className="employee-help">{field.help}</small>}</label>;})}</div>{section==='وضعیت و پیگیری'&&<div className="employee-mini-card mt-5 text-xs text-[var(--ew-muted)]">روزهای بدون اقدام: {String(existing?.days_without_action??'پس از ثبت و درج تاریخ آخرین اقدام محاسبه می‌شود')}</div>}{section==='اطلاعات مالی'&&<div className="employee-mini-card mt-5 text-sm font-bold text-[var(--ew-text)]">مانده محاسبه‌شده: {Number.isFinite(balance)?balance.toLocaleString('fa-IR'):'—'}</div>}</section>)}<div className="flex flex-wrap justify-end gap-3"><Link to="/employee/cases" className="employee-soft-button">بازگشت</Link>{!readOnly && <button disabled={saving} className="employee-button">{saving?'در حال ذخیره...':id?'ذخیره تغییرات':'ثبت پرونده'}</button>}</div></form>}
  </div></DashboardLayout>;
}
