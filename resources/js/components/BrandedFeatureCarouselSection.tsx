import * as React from 'react';
import { ArrowLeft, ArrowRight, FileSpreadsheet, MapPinned, Mountain, Ruler, ShieldCheck } from 'lucide-react';
import './branded-feature-carousel.css';

/**
 * Restores the animated homepage feature carousel removed in v5, with authentic
 * local surveying imagery and Persian content instead of the stock English demo.
 * No slide counters are displayed, as requested for the public site.
 */
const slides = [
  {
    id: 'survey',
    label: 'نقشه‌برداری زمینی',
    eyebrow: 'برداشت دقیق',
    title: 'از اندازه‌گیری میدانی تا نقشه قابل اتکا',
    description: 'برداشت وضع موجود و ثبت دقیق اطلاعات زمین، اولین گام برای تصمیم‌گیری صحیح در پروژه‌های ملکی و عمرانی است.',
    image: '/images/hero/hero3.webp',
    alt: 'نقشه‌بردار در حال برداشت زمینی با دوربین نقشه‌برداری',
    Icon: Ruler,
  },
  {
    id: 'utm',
    label: 'مختصات UTM',
    eyebrow: 'تعیین موقعیت',
    title: 'موقعیت روشن برای هر قطعه زمین',
    description: 'تهیه و مستندسازی مختصات زمین‌ها، باغ‌ها و مزارع برای سامان‌دهی بهتر اطلاعات مکانی.',
    image: '/images/hero/hero2.webp',
    alt: 'برداشت زمینی در محدوده اراضی کشاورزی',
    Icon: MapPinned,
  },
  {
    id: 'land',
    label: 'امور اراضی و ثبتی',
    eyebrow: 'مستندسازی اراضی',
    title: 'آگاهی بیشتر از وضعیت و محدوده ملک',
    description: 'تهیه نقشه و اطلاعات مکانی برای پرونده‌های ثبتی، ملکی و کشاورزی با رویکردی دقیق و منظم.',
    image: '/images/hero/hero4.webp',
    alt: 'نقشه‌برداری توپوگرافی و بررسی محدوده اراضی',
    Icon: Mountain,
  },
  {
    id: 'workflow',
    label: 'مدیریت پرونده‌ها',
    eyebrow: 'سامانه اختصاصی زمین‌نگار',
    title: 'از اکسل تا گزارش، در یک سامانه منسجم',
    description: 'ثبت، پیگیری و جست‌وجوی پرونده‌ها و گزارش فعالیت کارمندان در سامانه اختصاصی زمین‌نگار.',
    image: '/images/landing/survey-equipment-3d.webp',
    alt: 'تجهیزات دیجیتال نقشه‌برداری و گیرنده ماهواره‌ای',
    Icon: FileSpreadsheet,
  },
  {
    id: 'quality',
    label: 'نظم و دقت اطلاعات',
    eyebrow: 'پشتیبانی از تصمیم‌گیری',
    title: 'اطلاعات منظم، پیگیری ساده‌تر',
    description: 'سابقه ثبت پرونده‌ها، وضعیت رسیدگی و اطلاعات ثبت‌شده، در جریان کار شرکت قابل بررسی و پیگیری هستند.',
    image: '/images/hero/hero 11.webp',
    alt: 'تجهیزات حرفه‌ای نقشه‌برداری در محیط پروژه',
    Icon: ShieldCheck,
  },
] as const;

const ROTATION_MS = 5600;

export default function BrandedFeatureCarouselSection() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const rootRef = React.useRef<HTMLElement>(null);
  const startX = React.useRef<number | null>(null);

  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.15,
    });
    observer.observe(root);
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!visible || paused || (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActiveIndex((index) => (index + 1) % slides.length);
    }, ROTATION_MS);
    return () => window.clearInterval(timer);
  }, [visible, paused]);

  const go = React.useCallback((direction: number) => {
    setActiveIndex((index) => (index + direction + slides.length) % slides.length);
  }, []);

  const active = slides[activeIndex];
  return (
    <section
      id="zfeature"
      ref={rootRef}
      dir="rtl"
      aria-label="اسلایدر معرفی قابلیت‌های زمین‌نگار"
      className="zn-feature-section"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="zn-feature-container">
        <div className="zn-feature-section-heading">
          <span>از زمین تا پرونده</span>
          <h2>دقت در کار میدانی، نظم در اطلاعات</h2>
          <p>با خدمات و قابلیت‌های زمین‌نگار آشنا شوید.</p>
        </div>
        <div className="zn-feature-panel">
          <div className="zn-feature-info">
            <div className="zn-feature-eyebrow"><span aria-hidden="true" />{active.eyebrow}</div>
            <div className="zn-feature-description" aria-live="polite" aria-atomic="true" key={active.id}>
              <h3>{active.title}</h3>
              <p>{active.description}</p>
            </div>
            <div className="zn-feature-tabs" role="group" aria-label="انتخاب موضوع اسلایدر">
              {slides.map((slide, index) => {
                const Icon = slide.Icon;
                return <button
                  type="button"
                  key={slide.id}
                  className={`zn-feature-tab${index === activeIndex ? ' zn-feature-tab--active' : ''}`}
                  aria-pressed={index === activeIndex}
                  onClick={() => setActiveIndex(index)}
                >
                  <Icon size={19} aria-hidden="true" />
                  <span>{slide.label}</span>
                </button>;
              })}
            </div>
            <div className="zn-feature-controls">
              <button type="button" onClick={() => go(-1)} aria-label="اسلاید قبلی"><ArrowRight size={20} /></button>
              <button type="button" onClick={() => go(1)} aria-label="اسلاید بعدی"><ArrowLeft size={20} /></button>
              <span className="zn-feature-control-hint">برای دیدن موارد دیگر، ورق بزنید</span>
            </div>
          </div>
          <div
            className="zn-feature-visual"
            onTouchStart={(event) => { startX.current = event.touches[0]?.clientX ?? null; }}
            onTouchEnd={(event) => {
              if (startX.current === null) return;
              const distance = (event.changedTouches[0]?.clientX ?? startX.current) - startX.current;
              startX.current = null;
              if (Math.abs(distance) > 55) go(distance > 0 ? 1 : -1);
            }}
          >
            {slides.map((slide, index) => (
              <img
                key={slide.id}
                src={slide.image}
                alt={slide.alt}
                className={`zn-feature-image${activeIndex === index ? ' zn-feature-image--active' : ''}${slide.id === 'workflow' ? ' zn-feature-image--equipment' : ''}`}
                loading="lazy"
                decoding="async"
                aria-hidden={activeIndex !== index}
              />
            ))}
            <div className="zn-feature-image-shade" aria-hidden="true" />
            <div className="zn-feature-image-caption">زمین‌نگار <span aria-hidden="true">•</span> دقت در اندازه‌گیری</div>
          </div>
        </div>
      </div>
    </section>
  );
}
