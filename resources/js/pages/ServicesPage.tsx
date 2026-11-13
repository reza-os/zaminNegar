import { useEffect } from 'react';
import { ArrowLeft, ClipboardCheck, FileText, Layers3, MapPinned, Map, Ruler, Sprout, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import PublicSiteLayout from '../components/PublicSiteLayout';
import InteriorHero from '../components/InteriorHero';

const services = [
 { icon: MapPinned, title: 'برداشت و تعیین مختصات UTM', description: 'اندازه‌گیری و ثبت مختصات موقعیت زمین، ملک، باغ و مزرعه برای تهیه داده‌های مکان‌محور.', points: ['تعیین موقعیت نقاط', 'ثبت و آماده‌سازی مختصات', 'مستندسازی اطلاعات مکانی'] },
 { icon: Ruler, title: 'نقشه‌برداری و برداشت زمینی', description: 'برداشت وضع موجود زمین و عوارض برای آماده‌سازی نقشه‌های موردنیاز پروژه‌های ملکی، عمرانی و کشاورزی.', points: ['برداشت میدانی', 'تهیه نقشه وضع موجود', 'سازمان‌دهی داده‌های اندازه‌گیری'] },
 { icon: Layers3, title: 'توپوگرافی و نقشه‌های پایه', description: 'گردآوری اطلاعات شکل زمین و عوارض برای استفاده در مطالعات و برنامه‌ریزی‌های فنی.', points: ['برداشت عوارض', 'نمایش پستی و بلندی', 'آماده‌سازی خروجی نقشه'] },
 { icon: FileText, title: 'مستندات اراضی و امور ثبتی', description: 'آماده‌سازی اطلاعات و نقشه‌های موردنیاز برای بررسی پرونده‌های ملکی و ثبتی، با توجه به الزامات هر درخواست.', points: ['تهیه اطلاعات پایه', 'مستندات نقشه‌برداری', 'پیگیری مدارک پرونده'] },
 { icon: Sprout, title: 'نقشه‌برداری اراضی کشاورزی', description: 'ثبت و سامان‌دهی اطلاعات مکانی مزارع، باغ‌ها و قطعات اراضی برای پیگیری و مدیریت بهتر.', points: ['اطلاعات قطعات', 'برداشت محدوده', 'ثبت مشخصات مکانی'] },
 { icon: ClipboardCheck, title: 'مدیریت دیجیتال پرونده‌ها', description: 'ثبت درخواست اولیه و پیگیری وضعیت پرونده‌ها در فرآیند داخلی شرکت با قابلیت ورود داده و گزارش‌گیری.', points: ['ثبت درخواست برای دفتر منتخب', 'ورود اطلاعات و اکسل', 'پیگیری و گزارش‌گیری'] },
];
const qa = [
 { q: 'چطور درخواست خدمات ثبت کنم؟', a: 'از فرم درخواست در سایت استفاده کنید، دفتر موردنظر را انتخاب کنید و اطلاعات تماس خود را وارد کنید. درخواست برای همان دفتر ارسال می‌شود.' },
 { q: 'آیا ارسال درخواست به معنی تشکیل پرونده نهایی است؟', a: 'خیر. این فرم برای بررسی اولیه و هماهنگی است؛ تشکیل پرونده قطعی پس از بررسی دفتر و تکمیل مراحل لازم انجام می‌شود.' },
 { q: 'برای پیگیری درخواست چه اطلاعاتی لازم است؟', a: 'پس از ثبت، کد پیگیری را نگه دارید. برای مشاهده وضعیت، کد پیگیری و همان شماره همراه ثبت‌شده لازم است.' },
];
export default function ServicesPage() {
  useEffect(() => {
    document.title = 'خدمات نقشه‌برداری | زمین‌نگار';
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'آشنایی با خدمات برداشت UTM، نقشه‌برداری زمینی، توپوگرافی، نقشه اراضی و ثبت درخواست خدمات زمین‌نگار.');
  }, []);
  return <PublicSiteLayout>
    <main id="services-main">
      <InteriorHero variant="services" category="خدمات زمین‌نگار" title="خدمات نقشه‌برداری؛ از اندازه‌گیری تا مستندسازی" description="خدمات تخصصی برداشت UTM، نقشه‌برداری اراضی و سامان‌دهی اطلاعات پرونده‌ها، متناسب با نوع درخواست شما." image="/images/hero/02-utm-banner.webp" imageAlt="نمای نقشه‌برداری و داده‌های مکانی در یک منظره کوهستانی" icon={Map} />

      <section className="zn-interior-section" aria-labelledby="services-list-title">
        <div className="zn-interior-container">
          <div className="zn-section-centered"><span className="zn-section-eyebrow">حوزه‌های فعالیت</span><h2 id="services-list-title" className="zn-section-heading">چه خدماتی ارائه می‌کنیم؟</h2><p className="zn-body-text">برای بررسی نوع خدمت، درخواست خود را به دفتر موردنظر بفرستید تا هماهنگی‌های لازم انجام شود.</p></div>
          <div className="zn-service-grid">{services.map(({ icon: Icon, title, description, points }) => <article className="zn-service-card" key={title}>
            <span className="zn-service-icon"><Icon size={28} aria-hidden="true" /></span>
            <h3>{title}</h3><p>{description}</p>
            <ul>{points.map(point => <li key={point}><CheckCircle2 size={15} aria-hidden="true" />{point}</li>)}</ul>
            <Link to="/#contact" className="zn-inline-link">درخواست این خدمت <ArrowLeft size={17} aria-hidden="true" /></Link>
          </article>)}</div>
        </div>
      </section>

      <section className="zn-interior-section zn-interior-section--soft" aria-labelledby="services-steps-title">
        <div className="zn-interior-container zn-services-steps-layout">
          <div><span className="zn-section-eyebrow">درخواست آنلاین</span><h2 id="services-steps-title" className="zn-section-heading">شروع همکاری در چند مرحله</h2><p className="zn-body-text">ثبت آنلاین برای دریافت و بررسی درخواست است. کارشناس دفتر انتخاب‌شده درباره اطلاعات یا مراحل بعدی با شما هماهنگ می‌کند.</p><Link className="zn-btn-primary" to="/#contact">ثبت درخواست برای دفتر <ArrowLeft size={17}/></Link></div>
          <div className="zn-services-steps">{[{id:'۰۱',title:'انتخاب دفتر',text:'دفتر موردنظر را در فرم سایت مشخص کنید.'},{id:'۰۲',title:'ارسال اطلاعات',text:'نام، شماره تماس و توضیح خدمت را ثبت کنید.'},{id:'۰۳',title:'بررسی درخواست',text:'کارکنان دفتر درخواست را دریافت و پیگیری می‌کنند.'}].map(step => <div className="zn-steps-row" key={step.id}><span>{step.id}</span><div><h3>{step.title}</h3><p>{step.text}</p></div></div>)}</div>
        </div>
      </section>

      <section className="zn-interior-section" aria-labelledby="services-faq-title"><div className="zn-interior-container zn-faq-layout"><div><span className="zn-section-eyebrow">پرسش‌های متداول</span><h2 id="services-faq-title" className="zn-section-heading">پیش از ثبت درخواست</h2><p className="zn-body-text">پاسخ چند پرسش درباره فرآیند آنلاین ثبت و پیگیری درخواست خدمات.</p></div><div className="zn-faq-items">{qa.map(item => <details key={item.q}><summary>{item.q}</summary><p>{item.a}</p></details>)}</div></div></section>
    </main>
  </PublicSiteLayout>;
}
