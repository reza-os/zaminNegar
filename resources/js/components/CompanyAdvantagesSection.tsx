import { Check, FileSpreadsheet, ListChecks, SearchCheck, UsersRound } from 'lucide-react';
import { company } from '../config/company';

const icons = [ListChecks, SearchCheck, FileSpreadsheet, UsersRound];
/** جایگزین اسلایدر نمونه انگلیسی نامرتبط؛ مبتنی بر قابلیت‌های موجود شرکت */
export default function CompanyAdvantagesSection() {
  return <section id="zfeature" aria-labelledby="zn-adv-heading" className="zn-advantages-section">
    <div className="zn-interior-container zn-adv-grid">
      <div>
        <span className="zn-section-eyebrow">از زمین تا پرونده</span>
        <h2 className="zn-section-heading" id="zn-adv-heading">یک مسیر منظم برای اطلاعات نقشه‌برداری</h2>
        <p className="zn-body-text">در کنار فعالیت میدانی، ثبت و پیگیری داده‌ها با سامانه اختصاصی شرکت انجام می‌شود تا اطلاعات هر پرونده منسجم و قابل دسترسی باشد.</p>
        <ul className="zn-check-list">{company.advantages.slice(0, 3).map(value => <li key={value}><Check size={18} aria-hidden="true" />{value}</li>)}</ul>
      </div>
      <div className="zn-adv-tiles">{[
        ['ثبت اطلاعات', 'مدیریت ورودی‌های پرونده', icons[0]],
        ['جست‌وجو و پیگیری', 'دسترسی سریع به سوابق', icons[1]],
        ['ورود فایل اکسل', 'ثبت گروهی اطلاعات', icons[2]],
        ['گزارش فعالیت', 'نمایش اطلاعات و عملکرد', icons[3]],
      ].map(([title, text, Icon]) => { const Symbol = Icon as typeof ListChecks; return <div key={title as string} className="zn-adv-tile"><span><Symbol size={23} aria-hidden="true" /></span><strong>{title as string}</strong><small>{text as string}</small></div>; })}</div>
    </div>
  </section>;
}
