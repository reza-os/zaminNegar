import * as React from 'react';
import { Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import './coverflow-carousel.css';

/** سازگار با مسیرهای WebP در public و قابل استفاده برای هر مجموعه لوگو. */
export interface CoverflowSlide {
  id: string;
  src?: string;
  alt?: string;
  title: string;
}

export interface CoverflowCarouselProps {
  slides: readonly CoverflowSlide[];
  label?: string;
  className?: string;
  /** زاویه کارت مجاور؛ ۰ یعنی بدون افکت سه‌بعدی. */
  rotate?: number;
  /** به‌صورت پیش‌فرض انیمیشن خودکار خاموش است تا منابع مصرف نشوند. */
  autoplayMs?: number;
}

function Logo({ slide }: { slide: CoverflowSlide }) {
  const [imageFailed, setImageFailed] = React.useState(false);
  React.useEffect(() => setImageFailed(false), [slide.src]);
  if (!slide.src || imageFailed) {
    return (
      <span className="znp-placeholder" aria-label={slide.title}>
        <Building2 size={20} strokeWidth={1.35} aria-hidden="true" />
        <span>{slide.title}</span>
      </span>
    );
  }
  return (
    <img
      className="znp-logo"
      src={slide.src}
      alt={slide.alt || `لوگوی ${slide.title}`}
      width={152}
      height={78}
      loading="lazy"
      decoding="async"
      draggable={false}
      onError={() => setImageFailed(true)}
    />
  );
}

/**
 * اسلایدر کم‌حجم لوگوها، برگرفته از ایده Coverflow:
 * - بدون framer-motion و حلقه animationFrame؛ فقط transition بومی CSS.
 * - حداکثر هفت کارت در DOM، حتی اگر تعداد لوگوها زیاد شود.
 * - قابل کنترل با لمس افقی، ماوس، دکمه‌ها و کیبورد.
 * - پیمایش عمودی موبایل را مسدود نمی‌کند.
 */
export function CoverflowCarousel({
  slides,
  label = 'لوگوهای همکاران',
  className = '',
  rotate = 18,
  autoplayMs = 0,
}: CoverflowCarouselProps) {
  const count = slides.length;
  const [current, setCurrent] = React.useState(0);
  const active = count ? ((current % count) + count) % count : 0;
  const frameRef = React.useRef<HTMLDivElement>(null);
  const dragRef = React.useRef<{ x: number; y: number; id: number } | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const [isReducedMotion, setReducedMotion] = React.useState(false);

  const nudge = React.useCallback((step: number) => {
    if (count > 1) setCurrent((old) => (old + step + count) % count);
  }, [count]);

  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);

  React.useEffect(() => {
    const frame = frameRef.current;
    if (!frame || !autoplayMs) return;
    if (typeof IntersectionObserver === 'undefined') { setIsVisible(true); return; }
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting));
    observer.observe(frame);
    return () => observer.disconnect();
  }, [autoplayMs]);

  React.useEffect(() => {
    if (!autoplayMs || count < 2 || !isVisible || isReducedMotion) return;
    const timer = window.setInterval(() => {
      if (!document.hidden && !dragRef.current) nudge(1);
    }, Math.max(2500, autoplayMs));
    return () => window.clearInterval(timer);
  }, [autoplayMs, count, isVisible, isReducedMotion, nudge]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (count < 2 || (event.pointerType === 'mouse' && event.button !== 0)) return;
    dragRef.current = { x: event.clientX, y: event.clientY, id: event.pointerId };
    // دریافت PointerUp حتی اگر نشانگر از روی کارت خارج شد.
    if (event.pointerType === 'mouse') event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId || !frameRef.current) return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) < Math.abs(dy)) return;
    frameRef.current.style.setProperty('--znp-drag', `${Math.max(-70, Math.min(70, dx * 0.33))}px`);
  };

  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    dragRef.current = null;
    if (frameRef.current) frameRef.current.style.removeProperty('--znp-drag');
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    if (Math.abs(dx) > 36 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      // در صفحه راست‌به‌چپ، کشیدن به چپ یعنی اسلاید بعدی.
      nudge(dx < 0 ? 1 : -1);
    }
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const cancelPointer = () => {
    dragRef.current = null;
    frameRef.current?.style.removeProperty('--znp-drag');
  };

  if (!count) return null;

  return (
    <div className={`znp-carousel ${className}`} role="region" aria-roledescription="carousel" aria-label={label} dir="rtl">
      <div
        className="znp-stage"
        ref={frameRef}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPointer}
        onPointerCancel={cancelPointer}
        onKeyDown={(event) => {
          if (event.key === 'ArrowLeft') { event.preventDefault(); nudge(1); }
          if (event.key === 'ArrowRight') { event.preventDefault(); nudge(-1); }
        }}
      >
        {slides.map((slide, index) => {
          let offset = index - active;
          if (offset > count / 2) offset -= count;
          if (offset < -count / 2) offset += count;
          const distance = Math.abs(offset);
          // کارت‌های بسیار دور ساخته نمی‌شوند؛ دانلود عکس هم رخ نمی‌دهد.
          if (distance > 3) return null;
          const rake = Math.pow(distance, 0.65);
          const tilt = Math.min(rotate * rake, 35) * Math.sign(offset);
          // در حلقه‌های زوج، کارت دوردست پیش از رفتن به سمت دیگر محو می‌شود.
          const loopEdge = count > 3 && distance >= Math.min(3, Math.floor(count / 2)) ? 0 : 1;
          const opacity = Math.max(0.34, 1 - distance * 0.17) * loopEdge;
          return (
            <div
              key={slide.id}
              className={`znp-card ${offset === 0 ? 'znp-card--active' : ''}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${slide.title}؛ ${index + 1} از ${count}`}
              aria-current={index === active ? 'true' : undefined}
              aria-hidden={opacity === 0 ? true : undefined}
              style={{
                transform: `translate3d(calc(-50% + ${offset * 142}% + var(--znp-drag, 0px)), 0, ${-24 * rake}px) rotateY(${-tilt}deg)`,
                opacity,
                zIndex: 20 - Math.round(distance),
              }}
            >
              <Logo slide={slide} />
            </div>
          );
        })}
      </div>
      {count > 1 && (
        <div className="znp-bottom">
          <button type="button" className="znp-arrow" aria-label="لوگوی قبلی" onClick={() => nudge(-1)}>
            <ChevronRight size={17} strokeWidth={1.7} aria-hidden="true" />
          </button>
          <span className="znp-count" aria-live="polite" aria-atomic="true">
            {String(active + 1).padStart(2, '0')} <span>/</span> {String(count).padStart(2, '0')}
          </span>
          <button type="button" className="znp-arrow" aria-label="لوگوی بعدی" onClick={() => nudge(1)}>
            <ChevronLeft size={17} strokeWidth={1.7} aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

export default CoverflowCarousel;
