import { useEffect } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardCheck, Compass, FileSpreadsheet, MapPinned, ShieldCheck, UsersRound } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicSiteLayout from '../components/PublicSiteLayout';
import InteriorHero from '../components/InteriorHero';
import { company } from '../config/company';

const steps = [
  { number: '۱', title: 'شنیدن نیاز و بررسی درخواست', description: 'درخواست اولیه از طریق سایت یا دفاتر ثبت می‌شود تا نوع خدمت و اطلاعات موردنیاز مشخص شود.' },
  { number: '۲', title: 'برنامه‌ریزی و برداشت داده', description: 'با توجه به نوع پروژه، فعالیت میدانی و جمع‌آوری اطلاعات توسط تیم مربوط پیگیری می‌شود.' },
  { number: '۳', title: 'پردازش و تهیه خروجی', description: 'داده‌های برداشت‌شده برای تهیه نقشه، مستندات و گزارش‌های موردنیاز بررسی می‌شوند.' },
  { number: '۴', title: 'پیگیری و مدیریت پرونده', description: 'اطلاعات و مراحل رسیدگی در سامانه ثبت می‌شود تا پیگیری درخواست‌ها منظم‌تر باشد.' },
];
const values = [
  { icon: Compass, title: 'نگاه دقیق به زمین', text: 'توجه به مختصات، جزئیات میدانی و نظم در ثبت اطلاعات در تمام مراحل کار.' },
  { icon: ClipboardCheck, title: 'فرآیند قابل پیگیری', text: 'تلاش برای ثبت مرحله‌به‌مرحله درخواست‌ها، پرونده‌ها و سوابق فعالیت در سامانه اختصاصی.' },
  { icon: UsersRound, title: 'ارتباط با دفتر مربوط', text: 'امکان انتخاب دفتر هنگام ثبت درخواست تا پیام مستقیماً برای کارکنان همان دفتر ارسال شود.' },
];
export default function AboutPage() {
  useEffect(() => {
    document.title = 'معرفی شرکت | زمین‌نگار';
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'درباره شرکت زمین‌نگار، رویکرد نقشه‌برداری، خدمات اراضی و سامانه مدیریت اطلاعات پرونده‌ها.');
  }, []);
  return <PublicSiteLayout>
    <main id="about-main">
      <InteriorHero variant="about" category="معرفی شرکت" title="درباره زمین‌نگار؛ از شناخت زمین تا نظم اطلاعات" description="تلفیقی از خدمات نقشه‌برداری، تهیه مستندات اراضی و ابزارهای دیجیتال برای ثبت و پیگیری پرونده‌ها." image="/images/login/survey-office.webp" imageAlt="فضای کاری مدرن نقشه‌برداری همراه با رایانه و تجهیزات برداشت" icon={UsersRound} />

      <section className="zn-interior-section zn-about-intro" aria-labelledby="about-story-title">
        <div className="zn-interior-container zn-about-grid">
          <div>
            <span className="zn-section-eyebrow">آشنایی بیشتر</span>
            <h2 id="about-story-title" className="zn-section-heading">زمین‌نگار چه می‌کند؟</h2>
            <p className="zn-body-text">{company.description}</p>
            <p className="zn-body-text">هدف از طراحی سامانه زمین‌نگار، ساده‌تر کردن ثبت اطلاعات، ارتباط با دفاتر شرکت و پیگیری روند پرونده‌ها در کنار خدمات تخصصی میدانی است.</p>
            <Link to="/services" className="zn-inline-link">مشاهده حوزه‌های خدمات <ArrowLeft size={17} aria-hidden="true" /></Link>
          </div>
          <div className="zn-about-image-card">
            <img src="/images/hero/01-survey-banner.webp" alt="تجهیزات و فعالیت نقشه‌برداری در طبیعت کوهستانی" loading="lazy" />
            <div className="zn-about-image-caption"><MapPinned size={21} aria-hidden="true" /><div><strong>زمین، داده و تصمیم</strong><span>برداشت دقیق؛ اطلاعات منظم؛ پیگیری شفاف</span></div></div>
          </div>
        </div>
      </section>

      <section className="zn-interior-section zn-interior-section--soft" aria-labelledby="about-values-title">
        <div className="zn-interior-container">
          <span className="zn-section-eyebrow">رویکرد کاری</span>
          <h2 id="about-values-title" className="zn-section-heading">اصولی که طراحی خدمات و سامانه را شکل می‌دهند</h2>
          <div className="zn-value-grid">{values.map(({ icon: Icon, title, text }) => <article className="zn-value-card" key={title}><span className="zn-value-icon"><Icon size={27} aria-hidden="true" /></span><h3>{title}</h3><p>{text}</p></article>)}</div>
        </div>
      </section>

      <section className="zn-interior-section" aria-labelledby="about-process-title">
        <div className="zn-interior-container">
          <span className="zn-section-eyebrow">از درخواست تا نتیجه</span>
          <h2 id="about-process-title" className="zn-section-heading">مسیر همکاری چگونه پیش می‌رود؟</h2>
          <div className="zn-process-grid">{steps.map(step => <article key={step.number} className="zn-process-card"><span className="zn-process-index" aria-hidden="true">{step.number}</span><h3>{step.title}</h3><p>{step.description}</p></article>)}</div>
        </div>
      </section>

      <section className="zn-interior-section zn-interior-section--soft" aria-labelledby="about-system-title">
        <div className="zn-interior-container zn-system-callout">
          <div className="zn-system-callout-image"><img src="/images/landing/dashboard-survey-equipment.webp" alt="تجهیزات نقشه‌برداری شامل گیرنده GNSS و کنترلر میدانی" loading="lazy" /></div>
          <div><span className="zn-section-eyebrow">سامانه اختصاصی زمین‌نگار</span><h2 id="about-system-title" className="zn-section-heading">ثبت و پیگیری اطلاعات در کنار کار میدانی</h2><p className="zn-body-text">ورود دستی یا گروهی اطلاعات از اکسل، نمایش وضعیت پرونده‌ها و گزارش فعالیت کارکنان از قابلیت‌هایی هستند که برای سامان‌دهی امور داخلی در نظر گرفته شده‌اند.</p><ul className="zn-check-list">{['ورود اطلاعات و فایل اکسل', 'پیگیری وضعیت پرونده‌ها', 'مدیریت دسترسی کارکنان دفتر'].map(item => <li key={item}><CheckCircle2 size={18} />{item}</li>)}</ul><Link className="zn-btn-primary" to="/#contact">درخواست خدمات <ArrowLeft size={17}/></Link></div>
        </div>
      </section>
    </main>
  </PublicSiteLayout>;
}
