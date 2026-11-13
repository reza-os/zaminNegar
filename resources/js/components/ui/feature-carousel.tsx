"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CommandIcon,
  GlobalSearchIcon,
  AiCloudIcon,
  SmartPhone01Icon,
  CheckmarkCircle01Icon,
  DashboardSquare01Icon,
  MagicWandIcon,
} from "@hugeicons/core-free-icons";
import { cn } from "../../lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";

// Surveying-focused content. Original order, count, layout, and motion are preserved.
const FEATURES = [
  {
    id: "field-survey",
    label: "نقشه‌برداری زمینی",
    icon: GlobalSearchIcon,
    image: "/images/features/field-survey.webp",
    description: "برداشت دقیق وضع موجود و مستندسازی اطلاعات زمین.",
  },
  {
    id: "utm",
    label: "تعیین مختصات UTM",
    icon: CommandIcon,
    image: "/images/features/utm.webp",
    description: "تعیین موقعیت و آماده‌سازی مختصات اراضی و املاک.",
  },
  {
    id: "topography",
    label: "نقشه‌های توپوگرافی",
    icon: GlobalSearchIcon,
    image: "/images/features/topography.webp",
    description: "نمایش عوارض و پستی‌وبلندی زمین برای برنامه‌ریزی دقیق.",
  },
  {
    id: "projects",
    label: "پروژه‌های عمرانی",
    icon: CheckmarkCircle01Icon,
    image: "/images/features/projects.webp",
    description: "برداشت و تهیه اطلاعات نقشه‌برداری برای فعالیت‌های اجرایی.",
  },
  {
    id: "cadastre",
    label: "امور ثبتی و کاداستر",
    icon: DashboardSquare01Icon,
    image: "/images/features/cadastre.webp",
    description: "تهیه نقشه و مستندات مکانی موردنیاز پرونده‌های ثبتی.",
  },
  {
    id: "agriculture",
    label: "اراضی کشاورزی",
    icon: CommandIcon,
    image: "/images/features/agriculture.webp",
    description: "برداشت و سامان‌دهی اطلاعات مزارع، باغ‌ها و قطعات زمین.",
  },
  {
    id: "case-management",
    label: "مدیریت پرونده‌ها",
    icon: AiCloudIcon,
    image: "/images/features/case-management.webp",
    description: "ثبت و پیگیری منظم پرونده‌ها در سامانه زمین‌نگار.",
  },
  {
    id: "excel",
    label: "ورود اطلاعات اکسل",
    icon: DashboardSquare01Icon,
    image: "/images/features/excel.webp",
    description: "ورود گروهی اطلاعات و کاهش کارهای تکراری هنگام ثبت.",
  },
  {
    id: "tracking",
    label: "پیگیری وضعیت پرونده",
    icon: SmartPhone01Icon,
    image: "/images/features/tracking.webp",
    description: "دسترسی سریع‌تر به وضعیت رسیدگی و سوابق ثبت اطلاعات.",
  },
  {
    id: "reporting",
    label: "گزارش عملکرد",
    icon: MagicWandIcon,
    image: "/images/features/reporting.webp",
    description: "مرور فعالیت کارمندان و گزارش‌های مدیریتی در یک نما.",
  },
];

const AUTO_PLAY_INTERVAL = 3000;
const ITEM_HEIGHT = 65;

const wrap = (min: number, max: number, v: number) => {
  const rangeSize = max - min;
  return ((((v - min) % rangeSize) + rangeSize) % rangeSize) + min;
};

export function FeatureCarousel() {
  const [step, setStep] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);
  const seenImages = useRef<Set<number>>(new Set([0, 1, FEATURES.length - 1]));
  const [tabVisible, setTabVisible] = useState(true);

  // A carousel below the fold should not animate while it is not visible.
  useEffect(() => {
    const element = carouselRef.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sync = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  const currentIndex =
    ((step % FEATURES.length) + FEATURES.length) % FEATURES.length;

  const nextStep = useCallback(() => {
    setStep((prev) => prev + 1);
  }, []);

  const handleChipClick = (index: number) => {
    const diff = (index - currentIndex + FEATURES.length) % FEATURES.length;
    if (diff > 0) setStep((s) => s + diff);
  };

  useEffect(() => {
    if (isPaused || !isVisible || !tabVisible || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = setInterval(nextStep, AUTO_PLAY_INTERVAL);
    return () => clearInterval(interval);
  }, [nextStep, isPaused, isVisible, tabVisible]);

  const getCardStatus = (index: number) => {
    const diff = index - currentIndex;
    const len = FEATURES.length;

    let normalizedDiff = diff;
    if (diff > len / 2) normalizedDiff -= len;
    if (diff < -len / 2) normalizedDiff += len;

    if (normalizedDiff === 0) return "active";
    if (normalizedDiff === -1) return "prev";
    if (normalizedDiff === 1) return "next";
    return "hidden";
  };

  return (
    <div ref={carouselRef} className="w-full max-w-7xl mx-auto md:p-8">
      <div className="relative overflow-hidden rounded-[2.5rem] lg:rounded-[4rem] flex flex-col lg:flex-row min-h-[600px] lg:aspect-video border border-border/40">
        <div className="w-full lg:w-[40%] min-h-[350px] md:min-h-[450px] lg:h-full relative z-30 flex flex-col items-start justify-center overflow-hidden px-8 md:px-16 lg:pl-16 bg-[#087864] ">
          <div className="absolute inset-x-0 top-0 h-12 md:h-20 lg:h-16 bg-gradient-to-b from-[#087864] via-[#087864]/80 to-transparent z-40" />
          <div className="absolute inset-x-0 bottom-0 h-12 md:h-20 lg:h-16 bg-gradient-to-t from-[#087864] via-[#087864]/80 to-transparent z-40" />
          <div className="relative w-full h-full flex items-center justify-center lg:justify-start z-20">
            {FEATURES.map((feature, index) => {
              const isActive = index === currentIndex;
              const distance = index - currentIndex;
              const wrappedDistance = wrap(
                -(FEATURES.length / 2),
                FEATURES.length / 2,
                distance
              );

              return (
                <motion.div
                  key={feature.id}
                  style={{
                    height: ITEM_HEIGHT,
                    width: "fit-content",
                  }}
                  animate={{
                    y: wrappedDistance * ITEM_HEIGHT,
                    opacity: 1 - Math.abs(wrappedDistance) * 0.25,
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 90,
                    damping: 22,
                    mass: 1,
                  }}
                  className="absolute flex items-center justify-start"
                >
                  <button
                    type="button"
                    onClick={() => handleChipClick(index)}
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                    className={cn(
                      "relative flex items-center gap-4 px-6 md:px-10 lg:px-8 py-3.5 md:py-5 lg:py-4 rounded-full transition-all duration-700 text-left group border",
                      isActive
                        ? "bg-[#FFFEFA] text-[#087864] border-[#FFFEFA] z-10"
                        : "bg-transparent text-white/60 border-white/20 hover:border-white/40 hover:text-white"
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-center justify-center transition-colors duration-500",
                        isActive ? "text-[#087864]" : "text-white/40"
                      )}
                    >
                      <HugeiconsIcon
                        icon={feature.icon}
                        size={18}
                        strokeWidth={2}
                      />
                    </div>

                    <span dir="rtl" className="font-normal text-sm md:text-[15px] tracking-tight whitespace-nowrap uppercase">
                      {feature.label}
                    </span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        </div>

        <div className="flex-1 min-h-[500px] md:min-h-[600px] lg:h-full relative bg-secondary/30 flex items-center justify-center py-16 md:py-24 lg:py-16 px-6 md:px-12 lg:px-10 overflow-hidden border-t lg:border-t-0 lg:border-l border-border/20">
          <div className="relative w-full max-w-[420px] aspect-[4/5] flex items-center justify-center">
            {FEATURES.map((feature, index) => {
              const status = getCardStatus(index);
              const isActive = status === "active";
              const isPrev = status === "prev";
              const isNext = status === "next";
              if (status !== "hidden") seenImages.current.add(index);

              return (
                <motion.div
                  key={feature.id}
                  initial={false}
                  animate={{
                    x: isActive ? 0 : isPrev ? -100 : isNext ? 100 : 0,
                    scale: isActive ? 1 : isPrev || isNext ? 0.85 : 0.7,
                    opacity: isActive ? 1 : isPrev || isNext ? 0.4 : 0,
                    rotate: isPrev ? -3 : isNext ? 3 : 0,
                    zIndex: isActive ? 20 : isPrev || isNext ? 10 : 0,
                    pointerEvents: isActive ? "auto" : "none",
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 25,
                    mass: 0.8,
                  }}
                  className="absolute inset-0 rounded-[2rem] md:rounded-[2.8rem] overflow-hidden border-4 md:border-8 border-background bg-background origin-center"
                >
                  <img
                    src={seenImages.current.has(index) ? feature.image : undefined}
                    loading="lazy"
                    decoding="async"
                    alt={feature.label}
                    className={cn(
                      "w-full h-full object-cover transition-all duration-700",
                      isActive
                        ? "grayscale-0 blur-0"
                        : "grayscale blur-[2px] brightness-75"
                    )}
                  />

                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute inset-x-0 bottom-0 p-10 pt-32 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col justify-end pointer-events-none"
                      >
                        <div className="bg-background text-foreground px-4 py-1.5 rounded-full text-[11px] font-normal uppercase tracking-[0.2em] w-fit shadow-lg mb-3 border border-border/50">
                          {feature.label}
                        </div>
                        <p dir="rtl" className="text-white font-normal text-xl md:text-2xl leading-tight drop-shadow-md tracking-tight">
                          {feature.description}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div
                    className={cn(
                      "absolute top-8 left-8 flex items-center gap-3 transition-opacity duration-300",
                      isActive ? "opacity-100" : "opacity-0"
                    )}
                  >
                    <div className="w-2 h-2 rounded-full bg-white shadow-[0_0_10px_white]" />
                    <span className="text-white/80 text-[10px] font-normal uppercase tracking-[0.3em] font-mono">
                      زمین‌نگار
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FeatureCarousel
