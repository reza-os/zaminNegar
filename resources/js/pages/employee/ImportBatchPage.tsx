import { FormEvent, useEffect, useState } from 'react';
import { Link,useParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { api } from '../../api/client';
import './employee-warm.css';

type Item={id:number;case_number:string;owner_full_name:string;created_at:string;status?:{title:string}|null};
type Page={data:Item[];current_page:number;last_page:number;total:number};

export default function ImportBatchPage(){
  const {id}=useParams();const [page,setPage]=useState(1);const [query,setQuery]=useState('');const [search,setSearch]=useState('');
  const [items,setItems]=useState<Page|null>(null);const [error,setError]=useState('');const [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;setLoading(true);setError('');api.get<Page>(`/imports/${id}/cases`,{params:{page,search}}).then(({data})=>{if(active)setItems(data)}).catch(err=>{if(active)setError(err.response?.data?.message||'دریافت گروه ناموفق بود')}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[id,page,search]);
  function submit(e:FormEvent){e.preventDefault();setPage(1);setSearch(query.trim())}
  return <DashboardLayout><div dir="rtl" className="employee-warm-page space-y-5"><header className="employee-hero"><Link className="employee-badge-soft" to="/employee/import">بازگشت به فایل‌ها</Link><h1 className="mt-4 text-2xl font-black text-[var(--ew-text)]">پرونده‌های گروه اکسل #{id}</h1><p className="mt-2 text-sm leading-7 text-[var(--ew-muted)]">فقط پرونده‌هایی که همین فایل برای حساب شما ایجاد کرده است. این فهرست هم جست‌وجوپذیر است و هم اسکرول داخلی دارد.</p></header><form onSubmit={submit} className="employee-panel flex flex-col gap-2 sm:flex-row"><div className="relative min-w-0 flex-1"><Search aria-hidden size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--ew-muted)]"/><input aria-label="جست‌وجو در گروه" className="employee-input pr-11" value={query} onChange={e=>setQuery(e.target.value)} placeholder="شماره پرونده، نام یا کد ملی"/></div><button className="employee-secondary-button">جست‌وجو</button></form>{error&&<p role="alert" className="employee-alert">{error}</p>}{loading?<div className="employee-empty">در حال بارگذاری...</div>:<section className="employee-list-card employee-scroll space-y-3">{items?.data.map(item=><div key={item.id} className="employee-list-item"><div><strong className="text-[var(--ew-text)]">{item.owner_full_name}</strong><p className="mt-1 text-xs text-[var(--ew-muted)]">{item.case_number} • {item.status?.title||'بدون وضعیت'}</p></div><Link to={`/employee/cases/${item.id}/edit`} className="employee-soft-button !px-3 !py-2 !text-sm">ویرایش</Link></div>)}{items?.data.length===0&&<p className="employee-empty text-[var(--ew-muted)]">موردی یافت نشد.</p>}</section>}<div className="flex items-center justify-center gap-4 text-sm"><button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="employee-soft-button !px-4 !py-2 disabled:opacity-30">قبلی</button><span>{page.toLocaleString('fa-IR')} از {(items?.last_page||1).toLocaleString('fa-IR')} • {(items?.total||0).toLocaleString('fa-IR')} پرونده</span><button disabled={page>=(items?.last_page||1)} onClick={()=>setPage(p=>p+1)} className="employee-soft-button !px-4 !py-2 disabled:opacity-30">بعدی</button></div></div></DashboardLayout>;
}
