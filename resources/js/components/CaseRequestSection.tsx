import { CheckCircle2, ClipboardList, ShieldCheck } from 'lucide-react';
import { caseRequestSettings } from '../config/caseRequest';
import CaseRequestForm from './ui/case-request-form';
import './ui/case-request-form.css';

/** جایگزین بلوک تماس قبلی؛ حفظ #contact برای سازگاری با لینک نوبار و هیرو. */
export default function CaseRequestSection() {
  return (
    <section id="contact" aria-labelledby="zcr-title" className="zcr-section scroll-mt-28" dir="rtl">
      <div className="zcr-backdrop" aria-hidden="true" />
      <div className="zcr-container">
        <div className="zcr-panel">
          <div className="zcr-content">
            <span className="zcr-eyebrow"><ClipboardList size={15} aria-hidden="true" />{caseRequestSettings.eyebrow}</span>
            <h2 id="zcr-title" className="zcr-title">{caseRequestSettings.title}</h2>
            <p className="zcr-lead">{caseRequestSettings.description}</p>
            <ul className="zcr-benefits">
              {caseRequestSettings.points.map((item) => (
                <li key={item}><CheckCircle2 size={17} aria-hidden="true" />{item}</li>
              ))}
            </ul>
            <div className="zcr-footnote"><ShieldCheck size={17} aria-hidden="true" /> اطلاعات ارسالی جهت بررسی درخواست و هماهنگی با شما استفاده می‌شود.</div>
          </div>
          <CaseRequestForm />
        </div>
      </div>
    </section>
  );
}
