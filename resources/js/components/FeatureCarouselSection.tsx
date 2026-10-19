import * as React from 'react';
import './ui/feature-carousel.css';
import SectionErrorBoundary from './SectionErrorBoundary';

const FeatureCarousel = React.lazy(() => import('./ui/feature-carousel'));

/** Original blue two-column carousel, placed immediately before case request.
 * The demo is intentionally unchanged in wording and visual presentation.
 */
export default function FeatureCarouselSection() {
  const markerRef = React.useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = React.useState(false);

  React.useEffect(() => {
    const marker = markerRef.current;
    if (!marker || typeof IntersectionObserver === 'undefined') {
      setShouldMount(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setShouldMount(true);
        observer.disconnect();
      }
    }, { rootMargin: '350px' });
    observer.observe(marker);
    return () => observer.disconnect();
  }, []);

  return (
    <section id="zfeature" dir="ltr" aria-label="Feature carousel" className="px-4 py-12 sm:px-6 lg:py-16">
      <div ref={markerRef} className="mx-auto max-w-7xl">
        {shouldMount ? (
          <SectionErrorBoundary
            name="FeatureCarousel"
            fallback={
              <div role="status" dir="rtl" className="flex min-h-52 items-center justify-center rounded-[2.5rem] bg-[#62B2FE] px-6 py-12 text-center text-sm text-white lg:rounded-[4rem]">
                نمایش بخش معرفی در حال حاضر امکان‌پذیر نیست. سایر قسمت‌های سایت فعال هستند.
              </div>
            }
          >
            <React.Suspense fallback={<div aria-hidden="true" className="min-h-[600px] rounded-[2.5rem] bg-slate-100 lg:aspect-video lg:rounded-[4rem]" />}>
              <FeatureCarousel />
            </React.Suspense>
          </SectionErrorBoundary>
        ) : (
          <div aria-hidden="true" className="min-h-[600px] rounded-[2.5rem] bg-slate-100 lg:aspect-video lg:rounded-[4rem]" />
        )}
      </div>
    </section>
  );
}
