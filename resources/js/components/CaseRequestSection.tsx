import * as React from 'react';
import { CheckCircle2, ClipboardList, Search, ShieldCheck } from 'lucide-react';
import { caseRequestSettings } from '../config/caseRequest';
import { trackPublicCaseRequest, type TrackingResult } from '../api/caseRequests';
import CaseRequestForm from './ui/case-request-form';
import './ui/case-request-form.css';

const trackingStates: Record<string, string> = {
  new: 'ثبت اولیه', in_review: 'در حال بررسی توسط دفتر', contacted: 'کارشناس تماس گرفته است',
  accepted: 'درخواست پذیرفته شده', rejected: 'درخواست رد شده',
};

function TrackRequest() {
  const [code, setCode] = React.useState('');
  const [mobile, setMobile] = React.useState('');
  const [result, setResult] = React.useState<TrackingResult | null>(null);
  const [error, setError] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  async function track(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null);
    try { setResult(await trackPublicCaseRequest(code, mobile)); }
    catch (err) { setError(err instanceof Error ? err.message : 'پیگیری انجام نشد.'); }
    finally { setBusy(false); }
  }
  return <details className="zcr-tracking">
    <summary><Search size={17} aria-hidden="true"/> قبلاً درخواست ثبت کرده‌اید؟ پیگیری وضعیت</summary>
    <form className="zcr-tracking-form" onSubmit={event => void track(event)}>
      <label>کد پیگیری دریافتی<input value={code} onChange={event => setCode(event.target.value)} required minLength={14} maxLength={14} dir="ltr" placeholder="کد پیگیری ۱۴ کاراکتری" /></label>
      <label>شماره همراه ثبت‌شده<input value={mobile} onChange={event => setMobile(event.target.value)} required dir="ltr" inputMode="tel" placeholder="۰۹۱۲۱۲۳۴۵۶۷" /></label>
      <button type="submit" disabled={busy}>{busy ? 'در حال بررسی...' : 'مشاهده وضعیت'}</button>
    </form>
    {result && <p className="zcr-tracking-result" role="status">وضعیت درخواست: <strong>{trackingStates[result.status] || result.status}</strong></p>}
    {error && <p className="zcr-error" role="alert">{error}</p>}
  </details>;
}

/** Right: request copy and live form. Left: original 3D surveying-equipment visual. */
export default function CaseRequestSection() {
  return (
    <section id="contact" aria-labelledby="zcr-title" className="zcr-section scroll-mt-20" dir="rtl">
      <div className="zcr-backdrop" aria-hidden="true" />
      <div className="zcr-container">
        <div className="zcr-panel">
          <div className="zcr-main" aria-label="ثبت و پیگیری درخواست خدمات">
            <CaseRequestForm />
            <TrackRequest />
            <div className="zcr-footnote"><ShieldCheck size={16} aria-hidden="true" /> اطلاعات شما صرفاً برای پیگیری درخواست و هماهنگی خدمات استفاده می‌شود.</div>
          </div>
          <div className="zcr-content">
            <div className="zcr-content-copy">
              <span className="zcr-eyebrow"><ClipboardList size={15} aria-hidden="true" />{caseRequestSettings.eyebrow}</span>
              <h2 id="zcr-title" className="zcr-title">شروع پرونده، فقط با چند قدم ساده</h2>
              <p className="zcr-lead">دفتر موردنظر خود را انتخاب کنید تا درخواست شما مستقیماً به کارمندان همان دفتر ارسال شود.</p>
              <ul className="zcr-benefits">{caseRequestSettings.points.map(item =>
                <li key={item}><CheckCircle2 size={16} aria-hidden="true" />{item}</li>
              )}</ul>
            </div>
            <img className="zcr-description-art" src="/images/landing/dashboard-survey-equipment.webp" alt="" loading="lazy" decoding="async" aria-hidden="true" />
          </div>
        </div>
      </div>
    </section>
  );
}
