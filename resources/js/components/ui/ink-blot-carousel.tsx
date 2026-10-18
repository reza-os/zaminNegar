import * as React from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { HeroSlide } from '../../config/hero';
import './ink-blot-carousel.css';

type HeroAction = { label: string; href: string };

type InkBlotCarouselProps = {
  slides: HeroSlide[];
  primaryAction: HeroAction;
  secondaryAction: HeroAction;
  autoplay?: number;
  duration?: number;
  bleed?: number;
  className?: string;
};

type Transition = {
  id: number;
  to: number;
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
};

const wrap = (value: number, size: number) => (size ? ((value % size) + size) % size : 0);
const persianNumber = (value: number) => String(value).padStart(2, '0').replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)]);
const ease = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

function ActionLink({ action, primary }: { action: HeroAction; primary: boolean }) {
  const className = primary ? 'znh-action znh-action-primary' : 'znh-action znh-action-secondary';
  const children = <>{action.label}{primary && <ArrowLeft size={18} aria-hidden="true" />}</>;
  if (action.href.startsWith('#')) return <a href={action.href} className={className}>{children}</a>;
  if (action.href.startsWith('/')) return <Link to={action.href} className={className}>{children}</Link>;
  return <a href={action.href} className={className}>{children}</a>;
}

/**
 * لایه گذار: ماسک SVG با لبه‌های ناهموار شبیه پخش جوهر.
 * فقط هنگام تغییر اسلاید mount می‌شود؛ در بقیه زمان‌ها RAF و فیلتر فعال نیستند.
 * در موبایل و reduced-motion فیلتر سنگین حذف می‌شود.
 */
function InkTransitionLayer({ transition, duration, bleed, simpler, onDone }: {
  transition: Transition;
  duration: number;
  bleed: number;
  simpler: boolean;
  onDone: () => void;
}) {
  const maskId = React.useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const circlesRef = React.useRef<Array<SVGCircleElement | null>>([]);
  const onDoneRef = React.useRef(onDone);
  onDoneRef.current = onDone;

  const droplets = React.useMemo(() => {
    const seed = (transition.id * 7919) >>> 0;
    return Array.from({ length: 6 }, (_, index) => {
      const angle = ((index * 137.5 + seed % 41) * Math.PI) / 180;
      const distance = 52 + (index % 3) * 30;
      return [Math.cos(angle) * distance, Math.sin(angle) * distance, 0.3 + index * 0.055] as const;
    });
  }, [transition.id]);
  const points = [[0, 0, 1] as const, ...droplets];

  React.useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const maxRadius = Math.hypot(
      Math.max(transition.x, transition.width - transition.x),
      Math.max(transition.y, transition.height - transition.y),
    ) * 1.65;
    const actualDuration = simpler ? Math.min(500, duration) : duration;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / Math.max(actualDuration, 1));
      const amount = simpler ? t : ease(t);
      points.forEach(([,, scale], index) => {
        circlesRef.current[index]?.setAttribute('r', String(maxRadius * amount * scale));
      });
      if (t < 1) raf = requestAnimationFrame(tick);
      else onDoneRef.current();
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // points are deterministically derived from the transition and this component remounts per transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <svg className="znh-ink-layer" viewBox={`0 0 ${transition.width} ${transition.height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        {!simpler && (
          <filter id={`${maskId}-filter`} x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves={2} seed={4} />
            <feDisplacementMap in="SourceGraphic" scale={bleed} xChannelSelector="R" yChannelSelector="G" />
          </filter>
        )}
        <mask id={`${maskId}-mask`} maskUnits="userSpaceOnUse" x="0" y="0" width={transition.width} height={transition.height}>
          <rect width={transition.width} height={transition.height} fill="black" />
          <g filter={simpler ? undefined : `url(#${maskId}-filter)`}>
            {points.map(([dx, dy], index) => (
              <circle
                key={index}
                ref={(el) => { circlesRef.current[index] = el; }}
                cx={transition.x + dx}
                cy={transition.y + dy}
                r="0"
                fill="white"
              />
            ))}
          </g>
        </mask>
      </defs>
      <image
        href={transition.src}
        x="0" y="0" width={transition.width} height={transition.height}
        preserveAspectRatio="xMidYMid slice"
        mask={`url(#${maskId}-mask)`}
      />
    </svg>
  );
}

export default function InkBlotCarousel({
  slides,
  primaryAction,
  secondaryAction,
  autoplay = 7000,
  duration = 1350,
  bleed = 46,
  className = '',
}: InkBlotCarouselProps) {
  const [index, setIndex] = React.useState(0);
  const [incoming, setIncoming] = React.useState<Transition | null>(null);
  const [visible, setVisible] = React.useState(true);
  const [pageVisible, setPageVisible] = React.useState(true);
  const [hovered, setHovered] = React.useState(false);
  const [focusInside, setFocusInside] = React.useState(false);
  const [firstLoaded, setFirstLoaded] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(() => typeof window !== 'undefined' && matchMedia('(max-width: 767px)').matches);
  const [reducedMotion, setReducedMotion] = React.useState(() => typeof window !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [saveData, setSaveData] = React.useState(() => typeof navigator !== 'undefined' && Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData));
  const rootRef = React.useRef<HTMLElement>(null);
  const pointerStart = React.useRef<{ x: number; y: number } | null>(null);
  const nextId = React.useRef(0);
  const loadingId = React.useRef(0);
  const preloadRef = React.useRef<HTMLImageElement | null>(null);
  const length = slides.length;
  const currentSlide = slides[wrap(index, length)];
  const chooseSrc = React.useCallback((slide: HeroSlide) => (isMobile ? slide.mobileImage || slide.image : slide.image), [isMobile]);
  const displayedSlide = incoming ? slides[incoming.to] : currentSlide;

  React.useEffect(() => {
    const viewport = matchMedia('(max-width: 767px)');
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => { setIsMobile(viewport.matches); setReducedMotion(motion.matches); };
    viewport.addEventListener?.('change', update);
    motion.addEventListener?.('change', update);
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVisibility);
    const root = rootRef.current;
    const observer = root && typeof IntersectionObserver !== 'undefined'
      ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 })
      : null;
    if (root) observer?.observe(root);
    setSaveData(Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData));
    return () => {
      viewport.removeEventListener?.('change', update);
      motion.removeEventListener?.('change', update);
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
    };
  }, []);

  // فقط اسلاید بعدی در حافظه گرم می‌شود؛ برخلاف نمونه اصلی تمام عکس‌ها دانلود نمی‌شوند.
  React.useEffect(() => {
    if (!firstLoaded || !visible || !pageVisible || length < 2 || saveData) return;
    const next = new Image();
    next.decoding = 'async';
    next.src = chooseSrc(slides[wrap(index + 1, length)]);
    preloadRef.current = next;
    return () => { preloadRef.current = null; };
  }, [chooseSrc, firstLoaded, index, length, pageVisible, saveData, slides, visible]);

  const goTo = React.useCallback((nextIndex: number, point?: { x: number; y: number }) => {
    const root = rootRef.current;
    if (!root || length < 2 || incoming || nextIndex === index) return;
    const rect = root.getBoundingClientRect();
    const targetIndex = wrap(nextIndex, length);
    nextId.current += 1;
    loadingId.current += 1;
    const activeLoad = loadingId.current;
    const src = chooseSrc(slides[targetIndex]);
    const origin = point || { x: rect.width * (nextIndex > index ? 0.65 : 0.3), y: rect.height * 0.47 };
    const nextTransition: Transition = {
      id: nextId.current,
      to: targetIndex,
      x: origin.x,
      y: origin.y,
      width: Math.max(1, rect.width),
      height: Math.max(1, rect.height),
      src,
    };
    const targetImage = new Image();
    targetImage.src = src;
    // تصویر قبل از شروع افکت باید decode شده باشد؛ در اینترنت کند یک فریم خالی نمی‌بینیم.
    const finishLoading = () => {
      if (loadingId.current !== activeLoad) return;
      setIncoming(nextTransition);
    };
    if (targetImage.complete && targetImage.naturalWidth > 0) finishLoading();
    else targetImage.decode().then(finishLoading).catch(() => {
      if (loadingId.current === activeLoad) setIndex(targetIndex);
    });
  }, [chooseSrc, incoming, index, length, slides]);

  const finish = React.useCallback(() => {
    if (!incoming) return;
    setIndex(incoming.to);
    setIncoming(null);
  }, [incoming]);

  const autoPaused = !visible || !pageVisible || hovered || focusInside || Boolean(incoming) || reducedMotion || saveData;
  React.useEffect(() => {
    if (!autoplay || autoPaused || length < 2 || !firstLoaded) return;
    const timer = window.setTimeout(() => goTo(index + 1), autoplay);
    return () => window.clearTimeout(timer);
  }, [autoPaused, autoplay, firstLoaded, goTo, index, length]);

  const onPointerDown = (event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    pointerStart.current = { x: event.clientX, y: event.clientY };
  };
  const onPointerUp = (event: React.PointerEvent<HTMLElement>) => {
    const start = pointerStart.current;
    pointerStart.current = null;
    if (!start || (event.target as HTMLElement).closest('button,a')) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      goTo(index + (dx < 0 ? 1 : -1));
    } else if (Math.abs(dx) < 8 && Math.abs(dy) < 8 && event.target instanceof Element && event.target.closest('.znh-click-area')) {
      const rect = rootRef.current?.getBoundingClientRect();
      if (rect) goTo(index + 1, { x: event.clientX - rect.left, y: event.clientY - rect.top });
    }
  };

  if (!length || !currentSlide) return null;
  return (
    <section
      id="hero"
      ref={rootRef}
      className={`znh-root ${className}`}
      role="region"
      aria-label="بنر معرفی شرکت زمین‌نگار"
      aria-roledescription="اسلایدر تصاویر"
      dir="rtl"
      tabIndex={0}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocusInside(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setFocusInside(false); }}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onKeyDown={(event) => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          goTo(index + (event.key === 'ArrowLeft' ? 1 : -1));
        }
      }}
    >
      <div className="znh-background znh-click-area">
        <img
          key={`${currentSlide.id}-${isMobile ? 'mobile' : 'desktop'}`}
          src={chooseSrc(currentSlide)}
          alt={currentSlide.alt}
          className="znh-image"
          fetchPriority={index === 0 ? 'high' : 'auto'}
          loading="eager"
          decoding="async"
          onLoad={() => setFirstLoaded(true)}
          onError={(event) => { event.currentTarget.style.opacity = '0'; setFirstLoaded(true); }}
        />
        {incoming && (
          <InkTransitionLayer
            key={incoming.id}
            transition={incoming}
            duration={duration}
            bleed={bleed}
            simpler={isMobile || reducedMotion || saveData}
            onDone={finish}
          />
        )}
        <div className="znh-overlay-tint" aria-hidden="true" />
        <div className="znh-overlay-grid" aria-hidden="true" />
      </div>

      <div className="znh-copy" key={displayedSlide.id}>
        <div className="znh-eyebrow"><span className="znh-signal" />{displayedSlide.eyebrow}</div>
        <h1 className="znh-title">{displayedSlide.title}</h1>
        <p className="znh-description">{displayedSlide.description}</p>
        <div className="znh-actions">
          <ActionLink action={primaryAction} primary />
          <ActionLink action={secondaryAction} primary={false} />
        </div>
      </div>

      <div className="znh-footer">
        <div className="znh-counter" dir="ltr" aria-label={`اسلاید ${index + 1} از ${length}`}>
          <span>{persianNumber(wrap(incoming ? incoming.to : index, length) + 1)}</span>
          <span className="znh-counter-separator">/</span>
          <span>{persianNumber(length)}</span>
        </div>
        <div className="znh-controls" aria-label="کنترل اسلایدر">
          <button className="znh-nav" type="button" aria-label="اسلاید بعدی" onClick={() => goTo(index + 1)} disabled={Boolean(incoming) || length < 2}><ChevronRight size={19} /></button>
          <button className="znh-nav" type="button" aria-label="اسلاید قبلی" onClick={() => goTo(index - 1)} disabled={Boolean(incoming) || length < 2}><ChevronLeft size={19} /></button>
        </div>
      </div>
      <div className="znh-progress" aria-hidden="true">
        <div key={`${index}-${autoPaused}`} className="znh-progress-bar" style={{ animationDuration: `${autoplay}ms`, animationPlayState: autoPaused ? 'paused' : 'running', animationName: !autoplay || !firstLoaded ? 'none' : undefined }} />
      </div>
      <p className="znh-sr-only" aria-live="polite">{`اسلاید ${wrap(incoming ? incoming.to : index, length) + 1} از ${length}: ${displayedSlide.title}`}</p>
    </section>
  );
}
