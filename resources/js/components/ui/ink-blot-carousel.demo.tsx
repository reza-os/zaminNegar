import InkBlotCarousel from './ink-blot-carousel';
import { heroSettings, heroSlides } from '../../config/hero';

/** نمونه جداگانه برای دیدن بنر؛ در مسیرهای پروژه به‌صورت پیش‌فرض mount نمی‌شود. */
export default function HeroDemo() {
  return (
    <InkBlotCarousel
      slides={heroSlides}
      primaryAction={heroSettings.primaryAction}
      secondaryAction={heroSettings.secondaryAction}
      autoplay={heroSettings.autoplayMs}
      duration={heroSettings.durationMs}
      bleed={heroSettings.bleed}
    />
  );
}
