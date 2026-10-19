import {
  BarChart3,
  FileSpreadsheet,
  MapPinned,
  Ruler,
  ShieldCheck,
  Target,
  UsersRound,
} from 'lucide-react';
import SiteHeader from '../components/SiteHeader';
import PartnersSection from '../components/PartnersSection';
import RecentProjectsSection from '../components/RecentProjectsSection';
import CaseRequestSection from '../components/CaseRequestSection';
import FeatureCarouselSection from '../components/FeatureCarouselSection';
import SectionErrorBoundary from '../components/SectionErrorBoundary';
import { company } from '../config/company';
import * as React from 'react';
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
        <SectionErrorBoundary
          name="InfiniteSlider"
          fallback={<div role="status" className="flex h-[300px] items-center justify-center rounded-3xl bg-emerald-950 px-6 text-center text-sm text-white">بخش معرفی تصویری موقتاً در دسترس نیست.</div>}
        >
          <React.Suspense fallback={<div className="h-[480px] animate-pulse rounded-3xl bg-slate-200" aria-hidden="true" />}>
            <InfiniteSlider />
          </React.Suspense>
        </SectionErrorBoundary>
      ) : <div className="h-[480px] rounded-3xl bg-gradient-to-br from-emerald-950 to-slate-800" aria-hidden="true" />}
    </div>
  );
}


const serviceIcons = [Ruler, MapPinned, ShieldCheck, BarChart3];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f4f8fb] text-slate-900" dir="rtl">
      <SiteHeader />

      <main>
        {/* Full viewport starts at the top of the document; translucent header overlays the hero. */}
        <InkBlotCarousel
          slides={heroSlides}
          primaryAction={heroSettings.primaryAction}
          secondaryAction={heroSettings.secondaryAction}
          autoplay={heroSettings.autoplayMs}
          duration={heroSettings.durationMs}
          bleed={heroSettings.bleed}
        />

        {/* Lightweight responsive partner logos directly below the full-screen hero. */}
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

        <section id="system" className="scroll-mt-28 bg-slate-950 py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-3 text-sm font-black text-emerald-400">سامانه اختصاصی شرکت</div>
              <h2 className="text-3xl font-black md:text-4xl">
                ثبت، پیگیری و گزارش‌گیری پرونده‌ها در یک داشبورد
              </h2>
              <p className="mt-5 leading-9 text-slate-300">
                کارمندان شرکت می‌توانند اطلاعات کشاورزان و پرونده‌ها را به صورت دستی یا از طریق اکسل وارد کنند.
                مدیر نیز می‌تواند فعالیت هر کارمند، تاریخ ثبت اطلاعات، وضعیت پرونده‌ها و گزارش‌های کلی را مشاهده کند.
              </p>
            </div>

            <div className="grid gap-4">
              {[
                ['ثبت دستی اطلاعات کشاورز', UsersRound],
                ['ورود گروهی اطلاعات از اکسل', FileSpreadsheet],
                ['گزارش فعالیت کارمندان', ShieldCheck],
              ].map(([title, Icon]) => {
                const RealIcon = Icon as typeof UsersRound;

                return (
                  <div key={title as string} className="flex items-center gap-4 rounded-3xl bg-white/10 p-5">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                      <RealIcon />
                    </div>
                    <div className="font-black">{title as string}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Original FeatureCarousel demo styling, kept intact just before the case request form. */}
        <FeatureCarouselSection />

        <CaseRequestSection />
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>© {company.name} - {company.slogan}</div>
          <div>طراحی و توسعه سامانه مدیریت امور نقشه‌برداری</div>
        </div>
      </footer>
    </div>
  );
}
