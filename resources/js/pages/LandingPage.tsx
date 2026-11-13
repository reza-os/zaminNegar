import {
  BarChart3,
  FileSpreadsheet,
  MapPinned,
  Ruler,
  ShieldCheck,
  Target,
  UsersRound,
} from 'lucide-react';
import PublicSiteLayout from '../components/PublicSiteLayout';
import PartnersSection from '../components/PartnersSection';
import RecentProjectsSection from '../components/RecentProjectsSection';
import CaseRequestSection from '../components/CaseRequestSection';
import FeatureCarouselSection from '../components/FeatureCarouselSection';
import { company } from '../config/company';

import * as React from 'react';
import '../components/ui/dashboard-hero.css';
import InkBlotCarousel from '../components/ui/ink-blot-carousel';
import { heroSettings, heroSlides } from '../config/hero';

// Keeps the existing company showcase out of the initial landing-page JS bundle.
const InfiniteSlider = React.lazy(() =>
  import('../components/ui/argent-loop-infinite-slider').then((module) => ({ default: module.Component })),
);

function DeferredShowcase() {
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = React.useState(false);
  React.useEffect(() => {
    const element = sentinelRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') { setShouldMount(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setShouldMount(true); observer.disconnect(); }
    }, { rootMargin: '250px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={sentinelRef}>
      {shouldMount ? (
        <React.Suspense fallback={<div className="h-[480px] animate-pulse rounded-3xl bg-slate-200" aria-hidden="true" />}>
          <InfiniteSlider />
        </React.Suspense>
      ) : <div className="h-[480px] rounded-3xl bg-gradient-to-br from-emerald-950 to-slate-800" aria-hidden="true" />}
    </div>
  );
}


const serviceIcons = [Ruler, MapPinned, ShieldCheck, BarChart3];

export default function LandingPage() {
  React.useEffect(() => {
    document.title = 'زمین‌نگار | خدمات نقشه‌برداری و مدیریت اراضی';
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'خدمات نقشه‌برداری و برداشت UTM، معرفی زمین‌نگار و ثبت درخواست آنلاین برای دفاتر شرکت.');
  }, []);
  return (
    <PublicSiteLayout>
      <main>
        {/* Compact carousel follows the full-width rectangular header. */}
        <InkBlotCarousel
          slides={heroSlides}
          primaryAction={heroSettings.primaryAction}
          secondaryAction={heroSettings.secondaryAction}
          autoplay={heroSettings.autoplayMs}
          duration={heroSettings.durationMs}
          bleed={heroSettings.bleed}
        />

        {/* نشان واقعی سازمان‌ها، همراه با عنوان همگام با اسلایدر. */}
        <PartnersSection />

        {/* Minimal recent-project cards with local spotlight hover and lazy WebP images. */}
        <RecentProjectsSection />

        {/* Independent company showcase: normal page scroll continues outside its image stage. */}
        <section id="showcase" aria-labelledby="showcase-heading" className="mx-auto max-w-[1450px] scroll-mt-28 px-4 py-14 sm:px-6 lg:py-20">
          <div className="mb-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 flex items-center gap-2 text-sm font-black text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                معرفی زمین‌نگار
              </div>
              <h2 id="showcase-heading" className="max-w-3xl text-3xl font-black leading-relaxed text-slate-950 md:text-4xl">
                از شناخت زمین تا مدیریت اطلاعات آن
              </h2>
            </div>
            <p className="max-w-md text-sm leading-8 text-slate-600">
              حوزه‌های فعالیت ما را در یک روایت تصویری ببینید؛ تصاویر واقعی پروژه‌ها و اطلاعات تکمیلی به این بخش افزوده خواهند شد.
            </p>
          </div>
          <DeferredShowcase />
        </section>

        <section id="services" className="mx-auto max-w-7xl scroll-mt-28 px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 text-sm font-black text-emerald-700">خدمات شرکت</div>
            <h2 className="text-3xl font-black text-slate-950 md:text-4xl">
              خدمات تخصصی نقشه‌برداری و مدیریت اراضی
            </h2>
            <p className="mt-4 leading-8 text-slate-600">
              {company.description}
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {company.services.map((service, index) => {
              const Icon = serviceIcons[index] || Target;

              return (
                <div
                  key={service.title}
                  className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200"
                >
                  <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Icon size={28} />
                  </div>
                  <h3 className="text-lg font-black">{service.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{service.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Product-style dashboard showcase: equipment intentionally rises beyond the top edge. */}
        <section id="system" aria-labelledby="system-heading" className="zn-system-section relative isolate z-10 scroll-mt-28 overflow-visible bg-[#071f37] text-white">
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_48%,rgba(18,164,164,0.15),transparent_43%),linear-gradient(115deg,#09253e_0%,#071c33_59%,#051426_100%)]" />
          <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-full w-[36%] opacity-25 [background-image:repeating-radial-gradient(ellipse_at_100%_80%,transparent_0px,transparent_18px,rgba(41,199,183,0.24)_19px,transparent_20px)]" />
          <div className="relative mx-auto grid max-w-[1450px] grid-cols-1 items-center gap-8 px-5 py-11 sm:px-8 md:grid-cols-[1.1fr_0.9fr] md:gap-10 lg:grid-cols-[1.06fr_0.88fr_0.98fr] lg:gap-6 lg:py-9 xl:gap-10">
            <div className="relative z-10 text-right">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs font-black text-emerald-300 sm:text-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                سامانه اختصاصی شرکت
              </div>
              <h2 id="system-heading" className="max-w-[630px] text-[clamp(1.45rem,2.4vw,2.45rem)] font-black leading-[1.65] tracking-tight">
                ثبت، پیگیری و گزارش‌گیری پرونده‌ها در یک داشبورد
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-8 text-slate-200/85 sm:text-base">
                کارمندان شرکت می‌توانند اطلاعات کشاورزان و پرونده‌ها را به صورت دستی یا از طریق اکسل وارد کنند.
                مدیر نیز می‌تواند فعالیت هر کارمند، تاریخ ثبت اطلاعات، وضعیت پرونده‌ها و گزارش‌های کلی را مشاهده کند.
              </p>
            </div>

            <div className="relative z-10 grid gap-3">
              {[
                ['ثبت دستی اطلاعات کشاورز', UsersRound],
                ['ورود گروهی اطلاعات از اکسل', FileSpreadsheet],
                ['گزارش فعالیت کارمندان', ShieldCheck],
              ].map(([title, Icon]) => {
                const RealIcon = Icon as typeof UsersRound;
                return (
                  <div key={title as string} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/[0.07] px-4 py-3.5 shadow-sm backdrop-blur-[3px] transition-colors hover:border-emerald-300/30 hover:bg-white/[0.11] sm:py-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-emerald-400/15 text-emerald-300">
                      <RealIcon size={22} aria-hidden="true" />
                    </div>
                    <div className="text-sm font-extrabold leading-7 text-white sm:text-base">{title as string}</div>
                  </div>
                );
              })}
            </div>

            <div className="zn-system-art pointer-events-none relative mx-auto h-[250px] w-full max-w-[470px] overflow-visible md:col-span-2 md:h-[315px] md:max-w-[530px] lg:col-span-1 lg:-mt-20 lg:mb-0 lg:h-[345px] lg:max-w-none" aria-label="نمای سه‌بعدی تجهیزات نقشه‌برداری">
              <div aria-hidden="true" className="absolute bottom-10 left-[5%] h-32 w-[86%] rounded-[100%] bg-emerald-400/10 blur-3xl" />
              <img
                src="/images/landing/dashboard-survey-equipment.webp"
                alt="نمای سه‌بعدی گیرنده GNSS، دوربین توتال استیشن و کنترلر نقشه‌برداری"
                className="zn-system-art-img absolute bottom-0 left-1/2 w-[min(112%,520px)] max-w-none -translate-x-1/2 object-contain drop-shadow-[0_14px_21px_rgba(0,0,0,0.25)] md:w-[min(112%,570px)] lg:w-[min(148%,610px)]"
                loading="lazy"
                decoding="async"
              />
            </div>
          </div>
        </section>

        {/* Original animated carousel restored: only branded content, colors and images changed. */}
        <FeatureCarouselSection />

        <CaseRequestSection />
      </main>

    </PublicSiteLayout>
  );
}
