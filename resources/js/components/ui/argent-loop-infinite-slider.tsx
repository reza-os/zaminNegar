import * as React from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, MapPinned, MoveUpRight } from 'lucide-react';
import { landingSlides, landingSliderBrandLogo, type LandingSlide, type SliderVisual } from '../../config/slider';
import { company } from '../../config/company';
import './argent-loop-infinite-slider.css';

const CONFIG = {
  BUFFER_SIZE: 3,
  LERP_FACTOR: 0.11,
  WHEEL_SPEED: 0.75,
  MAX_VELOCITY: 150,
  WHEEL_THRESHOLD: 52,
  WHEEL_COOLDOWN: 410,
} as const;

type SliderProps = {
  slides?: LandingSlide[];
  className?: string;
};

type MotionState = {
  currentY: number;
  targetY: number;
  slideHeight: number;
  isDragging: boolean;
  dragStartY: number;
  dragStartX: number;
  dragStartTarget: number;
  pointerType: string;
  wheelDelta: number;
  lastWheelNavigation: number;
};

const loopIndex = (index: number, length: number) => ((index % length) + length) % length;
const asPersianNumber = (number: number) => String(number).padStart(2, '0').replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]);

/** Lightweight local artwork used until real photography is supplied. */
function TechnicalArtwork({ visual, gridId }: { visual: SliderVisual; gridId: string }) {
  return (
    <svg className="zns-artwork" viewBox="0 0 900 700" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern id={gridId} width="48" height="48" patternUnits="userSpaceOnUse">
          <path d="M 48 0 L 0 0 0 48" className="zns-art-grid" fill="none" />
        </pattern>
      </defs>
      <rect width="900" height="700" fill={`url(#${gridId})`} />
      <g className="zns-art-lines">
        {visual === 'terrain' && (
          <>
            <path d="M-110 265 C150 -45 420 530 960 95" />
            <path d="M-110 310 C150 0 420 575 960 140" />
            <path d="M-110 355 C150 45 420 620 960 185" />
            <path d="M-110 400 C150 90 420 665 960 230" />
            <path d="M-110 445 C150 135 420 710 960 275" />
            <path d="M-110 490 C150 180 420 755 960 320" />
            <path d="M-110 535 C150 225 420 800 960 365" />
          </>
        )}
        {visual === 'utm' && (
          <>
            <path d="M120 160 H790 V560 H120 Z M120 360 H790 M455 160 V560" />
            <path d="M120 260 H790 M120 460 H790 M290 160 V560 M620 160 V560" strokeDasharray="9 15" />
            <circle cx="455" cy="360" r="108" />
            <circle cx="455" cy="360" r="63" />
            <path d="M455 100 V620 M60 360 H840" />
          </>
        )}
        {visual === 'cadastre' && (
          <>
            <path d="M95 195 L335 125 L525 235 L788 158 L820 500 L600 580 L335 525 L115 585 Z" />
            <path d="M335 125 L335 525 M525 235 L600 580 M95 365 L810 350 M335 365 L525 235 M600 350 L788 158" />
            <path d="M115 585 L335 365 L600 580 M335 525 L600 350" strokeDasharray="12 12" />
          </>
        )}
        {visual === 'farmland' && (
          <>
            <path d="M65 240 L715 85 L835 525 L185 680 Z" />
            {Array.from({ length: 10 }, (_, i) => (
              <path key={i} d={`M${85 + i * 66} ${235 - i * 15.8} L${205 + i * 66} ${675 - i * 15.8}`} />
            ))}
            <path d="M105 390 L755 235 M145 540 L795 385" strokeDasharray="13 14" />
          </>
        )}
        {visual === 'dashboard' && (
          <>
            <rect x="130" y="128" width="640" height="442" rx="18" />
            <path d="M130 211 H770 M345 211 V570 M130 392 H770" />
            <path d="M177 338 L224 296 L264 319 L299 252" />
            <path d="M385 338 L440 302 L488 311 L560 254 L627 280 L720 239" />
            <path d="M390 520 V466 H436 V520 M460 520 V429 H506 V520 M530 520 V454 H576 V520 M600 520 V420 H646 V520 M670 520 V441 H716 V520" />
          </>
        )}
      </g>
      <g className="zns-art-points">
        <circle cx="455" cy="360" r="8" />
        <circle cx="335" cy="210" r="5" />
        <circle cx="690" cy="475" r="5" />
        <path d="M455 329 V391 M424 360 H486 M335 191 V229 M316 210 H354 M690 456 V494 M671 475 H709" />
      </g>
    </svg>
  );
}

function SlideVisual({ slide, artId }: { slide: LandingSlide; artId: string }) {
  return (
    <div className="zns-visual" data-visual={slide.visual}>
      {slide.image ? (
        <img className="zns-photo" src={slide.image} alt="" loading="lazy" />
      ) : (
        <TechnicalArtwork visual={slide.visual} gridId={artId} />
      )}
      <div className="zns-visual-shade" />
    </div>
  );
}

/**
 * اسلایدر حلقه‌ای با پارالاکس و اسنپ برای صفحه معرفی زمین‌نگار.
 * بدون وابستگی جدید؛ با React، TypeScript، Tailwind و CSS محلی کار می‌کند.
 * چرخ ماوس تنها بعد از فوکوس‌کردن قابِ تصویر اسلاید را جابه‌جا می‌کند تا
 * اسکرول عادی صفحه لندینگ مختل نشود. سوایپ افقی موبایل نیز پشتیبانی می‌شود.
 */
export function Component({ slides = landingSlides, className = '' }: SliderProps) {
  const [activeAbsoluteIndex, setActiveAbsoluteIndex] = React.useState(0);
  const [visibleRange, setVisibleRange] = React.useState({ min: -CONFIG.BUFFER_SIZE, max: CONFIG.BUFFER_SIZE });
  const stageRef = React.useRef<HTMLDivElement>(null);
  const itemRefs = React.useRef<Map<number, HTMLDivElement>>(new Map());
  const rafRef = React.useRef<number | null>(null);
  const renderedRange = React.useRef({ min: -CONFIG.BUFFER_SIZE, max: CONFIG.BUFFER_SIZE });
  const activeRef = React.useRef(0);
  const reducedMotion = React.useRef(false);
  const motion = React.useRef<MotionState>({
    currentY: 0,
    targetY: 0,
    slideHeight: 1,
    isDragging: false,
    dragStartY: 0,
    dragStartX: 0,
    dragStartTarget: 0,
    pointerType: 'mouse',
    wheelDelta: 0,
    lastWheelNavigation: 0,
  });

  const goTo = React.useCallback((index: number) => {
    const m = motion.current;
    if (!slides.length) return;
    m.isDragging = false;
    m.targetY = -index * m.slideHeight;
    activeRef.current = index;
    setActiveAbsoluteIndex(index);
    const nextRange = { min: index - CONFIG.BUFFER_SIZE, max: index + CONFIG.BUFFER_SIZE };
    if (nextRange.min !== renderedRange.current.min || nextRange.max !== renderedRange.current.max) {
      renderedRange.current = nextRange;
      setVisibleRange(nextRange);
    }
  }, [slides.length]);

  React.useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !slides.length) return;
    let running = true;
    let inViewport = false;
    const m = motion.current;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotion.current = media.matches;
    const onMotionPreferenceChange = (event: MediaQueryListEvent) => { reducedMotion.current = event.matches; };
    media.addEventListener?.('change', onMotionPreferenceChange);

    const onResize = () => {
      const newHeight = stage.clientHeight;
      if (!newHeight) return;
      m.slideHeight = newHeight;
      m.targetY = -activeRef.current * newHeight;
      m.currentY = m.targetY;
    };
    const observer = new ResizeObserver(onResize);
    observer.observe(stage);
    const intersectionObserver = new IntersectionObserver((entries) => {
      inViewport = entries[0]?.isIntersecting ?? true;
      if (inViewport && rafRef.current == null) {
        rafRef.current = requestAnimationFrame(animate);
      } else if (!inViewport && rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    }, { rootMargin: '150px' });
    intersectionObserver.observe(stage);
    onResize();

    const onWheel = (event: WheelEvent) => {
      // Preserve native page scroll until the user explicitly focuses the image area.
      if (document.activeElement !== stage || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const now = performance.now();
      if (now - m.lastWheelNavigation < CONFIG.WHEEL_COOLDOWN) return;
      const multiplier = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? stage.clientHeight : 1;
      const delta = Math.max(-CONFIG.MAX_VELOCITY, Math.min(CONFIG.MAX_VELOCITY, event.deltaY * multiplier * CONFIG.WHEEL_SPEED));
      m.wheelDelta += delta;
      if (Math.abs(m.wheelDelta) < CONFIG.WHEEL_THRESHOLD) return;
      const direction = m.wheelDelta > 0 ? 1 : -1;
      m.wheelDelta = 0;
      m.lastWheelNavigation = now;
      goTo(activeRef.current + direction);
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      m.dragStartX = event.clientX;
      m.dragStartY = event.clientY;
      m.dragStartTarget = m.targetY;
      m.pointerType = event.pointerType;
      m.isDragging = event.pointerType === 'mouse';
      if (event.pointerType === 'mouse') {
        stage.focus({ preventScroll: true });
        stage.setPointerCapture(event.pointerId);
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!m.isDragging || m.pointerType !== 'mouse') return;
      m.targetY = m.dragStartTarget + (event.clientY - m.dragStartY) * 0.95;
      // Keep the finite rendered buffer sufficient during a long mouse drag.
      const provisional = Math.round(-m.targetY / m.slideHeight);
      const range = renderedRange.current;
      if (provisional !== activeRef.current && (provisional < range.min + 1 || provisional > range.max - 1)) {
        const nextRange = { min: provisional - CONFIG.BUFFER_SIZE, max: provisional + CONFIG.BUFFER_SIZE };
        renderedRange.current = nextRange;
        setVisibleRange(nextRange);
      }
    };

    const onPointerUp = (event: PointerEvent) => {
      if (m.pointerType === 'touch' || m.pointerType === 'pen') {
        const dx = event.clientX - m.dragStartX;
        const dy = event.clientY - m.dragStartY;
        if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.25) {
          goTo(activeRef.current + (dx < 0 ? 1 : -1));
        }
      } else if (m.isDragging) {
        const nextIndex = Math.round(-m.targetY / m.slideHeight);
        goTo(nextIndex);
      }
      m.isDragging = false;
      if (stage.hasPointerCapture(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
        event.preventDefault();
        goTo(activeRef.current + 1);
      } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
        event.preventDefault();
        goTo(activeRef.current - 1);
      }
    };

    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('pointerdown', onPointerDown);
    stage.addEventListener('pointermove', onPointerMove);
    stage.addEventListener('pointerup', onPointerUp);
    stage.addEventListener('pointercancel', onPointerUp);
    stage.addEventListener('keydown', onKeyDown);

    const animate = () => {
      if (!running || !inViewport) {
        rafRef.current = null;
        return;
      }
      const difference = m.targetY - m.currentY;
      m.currentY = reducedMotion.current || Math.abs(difference) < 0.15
        ? m.targetY
        : m.currentY + difference * CONFIG.LERP_FACTOR;

      itemRefs.current.forEach((element, index) => {
        const position = index * m.slideHeight + m.currentY;
        element.style.transform = `translate3d(0, ${position}px, 0)`;
        const visual = element.firstElementChild as HTMLElement | null;
        if (visual) {
          const parallax = reducedMotion.current ? 0 : Math.max(-105, Math.min(105, -position * 0.13));
          visual.style.transform = `translate3d(0, ${parallax}px, 0) scale(1.16)`;
        }
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    // RAF starts only when IntersectionObserver reports the showcase in view.

    return () => {
      running = false;
      observer.disconnect();
      intersectionObserver.disconnect();
      media.removeEventListener?.('change', onMotionPreferenceChange);
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('pointerdown', onPointerDown);
      stage.removeEventListener('pointermove', onPointerMove);
      stage.removeEventListener('pointerup', onPointerUp);
      stage.removeEventListener('pointercancel', onPointerUp);
      stage.removeEventListener('keydown', onKeyDown);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [goTo, slides.length]);

  if (!slides.length) return null;
  const currentIndex = loopIndex(activeAbsoluteIndex, slides.length);
  const currentSlide = slides[currentIndex];
  const indices = Array.from({ length: visibleRange.max - visibleRange.min + 1 }, (_, offset) => visibleRange.min + offset);
  const previewIndices = [activeAbsoluteIndex - 1, activeAbsoluteIndex, activeAbsoluteIndex + 1];

  return (
    <div className={`zns-shell ${className}`} dir="rtl" aria-roledescription="اسلایدر خدمات زمین‌نگار" aria-label="معرفی حوزه‌های فعالیت زمین‌نگار">
      <div className="zns-stage" ref={stageRef} tabIndex={0} role="region" aria-label="تصاویر خدمات؛ با کلیدهای جهت یا پس از کلیک با چرخ ماوس حرکت کنید">
        <div className="zns-slides" aria-hidden="true">
          {indices.map((absoluteIndex) => {
            const slide = slides[loopIndex(absoluteIndex, slides.length)];
            return (
              <div
                key={absoluteIndex}
                className="zns-slide"
                ref={(element) => {
                  if (element) itemRefs.current.set(absoluteIndex, element);
                  else itemRefs.current.delete(absoluteIndex);
                }}
              >
                <SlideVisual slide={slide} artId={`zns-art-${absoluteIndex}`} />
              </div>
            );
          })}
        </div>

        <div className="zns-brand">
          <span className="zns-brand-mark">
            {landingSliderBrandLogo ? <img src={landingSliderBrandLogo} alt="" className="zns-brand-logo" /> : <MapPinned size={17} strokeWidth={2.2} />}
          </span>
          <span>{company.name} <i /> دیدی دقیق‌تر به زمین</span>
        </div>
        <div className="zns-top-marker"><span className="zns-marker-dot" /> LAND & SURVEYING</div>

        <div className="zns-overlay" aria-live="polite" aria-atomic="true" key={currentSlide.id}>
          <span className="zns-kicker">{currentSlide.eyebrow}</span>
          <h3 className="zns-slide-title">{currentSlide.title}</h3>
          <p className="zns-description">{currentSlide.description}</p>
          <a className="zns-action" href={currentSlide.href}>
            {currentSlide.linkLabel}
            <ArrowLeft size={18} aria-hidden="true" />
          </a>
        </div>

        <div className="zns-stage-bottom" aria-hidden="true">
          <span>EXPLORE / ZAMIN NEGAR</span>
          <span className="zns-stage-rule" />
          <span>حرکت بین نماها</span>
        </div>
      </div>

      <aside className="zns-rail" aria-label="پیش‌نمایش و کنترل اسلایدر">
        <div className="zns-rail-head">
          <span className="zns-rail-eyebrow">زمین‌نگار / معرفی</span>
          <div className="zns-pagination" aria-label={`اسلاید ${currentIndex + 1} از ${slides.length}`} dir="ltr">
            <strong>{asPersianNumber(currentIndex + 1)}</strong>
            <span>/</span>
            <span>{asPersianNumber(slides.length)}</span>
          </div>
          <h4>نگاهی نزدیک‌تر<br />به آنچه انجام می‌دهیم</h4>
          <p>خدمات تخصصی برای شناخت، ثبت و مدیریت دقیق اراضی</p>
        </div>

        <div className="zns-previews" aria-label="پیش‌نمایش اسلایدهای مجاور">
          {previewIndices.map((absoluteIndex) => {
            const slide = slides[loopIndex(absoluteIndex, slides.length)];
            const selected = absoluteIndex === activeAbsoluteIndex;
            return (
              <button
                key={absoluteIndex}
                type="button"
                className={`zns-preview ${selected ? 'is-active' : ''}`}
                onClick={() => goTo(absoluteIndex)}
                aria-label={`نمایش: ${slide.category}`}
                aria-current={selected ? 'true' : undefined}
              >
                <span className="zns-preview-visual" data-visual={slide.visual}>
                  {slide.image ? <img src={slide.image} alt="" loading="lazy" /> : <span className="zns-preview-grid" />}
                </span>
                <span className="zns-preview-text">
                  <small>{asPersianNumber(loopIndex(absoluteIndex, slides.length) + 1)}</small>
                  <span>{slide.category}</span>
                </span>
                {selected ? <span className="zns-active-indicator" /> : null}
              </button>
            );
          })}
        </div>

        <div className="zns-rail-foot">
          <div className="zns-dots" aria-label="انتخاب مستقیم اسلاید">
            {slides.map((slide, index) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => {
                  const forward = loopIndex(index - currentIndex, slides.length);
                  const backward = forward - slides.length;
                  goTo(activeAbsoluteIndex + (Math.abs(backward) < Math.abs(forward) ? backward : forward));
                }}
                aria-label={`اسلاید ${asPersianNumber(index + 1)}: ${slide.category}`}
                aria-current={index === currentIndex ? 'true' : undefined}
                className={index === currentIndex ? 'is-active' : ''}
              />
            ))}
          </div>
          <div className="zns-arrow-controls">
            <button type="button" aria-label="اسلاید قبلی" onClick={() => goTo(activeAbsoluteIndex - 1)}><ArrowUp size={19} /></button>
            <button type="button" aria-label="اسلاید بعدی" onClick={() => goTo(activeAbsoluteIndex + 1)}><ArrowDown size={19} /></button>
          </div>
          <span className="zns-interaction-hint"><MoveUpRight size={14} aria-hidden="true" /> سوایپ یا دکمه‌های پیمایش</span>
        </div>
      </aside>
    </div>
  );
}

export default Component;
