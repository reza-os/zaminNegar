import { CoverflowCarousel } from './ui/coverflow-carousel';
import { partnerBrands, partnersSection } from '../config/partners';

/** لوگوهای همکاران، درست بعد از هیرو؛ جدا از بقیه اسلایدرهای سایت. */
export default function PartnersSection() {
  return (
    <section id="partners" aria-labelledby="partners-heading" className="relative mx-auto mt-8 max-w-7xl scroll-mt-28 px-4 pb-4 sm:mt-12 sm:px-6 sm:pb-6 lg:mt-14">
      <header className="mx-auto max-w-xl text-center">
        <p className="text-[11px] font-semibold tracking-normal text-emerald-700 sm:text-xs">{partnersSection.eyebrow}</p>
        <h2 id="partners-heading" className="mt-1.5 text-lg font-bold leading-8 text-slate-800 sm:text-[22px]">{partnersSection.title}</h2>
        <p className="mt-1 text-xs leading-6 text-slate-500 sm:text-[13px]">{partnersSection.description}</p>
      </header>
      <div className="mt-3 sm:mt-5">
        <CoverflowCarousel slides={partnerBrands.map((brand) => ({
          id: brand.id,
          src: brand.logoSrc,
          alt: brand.logoAlt || `لوگوی ${brand.name}`,
          title: brand.name,
        }))} label="لوگوهای مجموعه‌های همکار و کارفرمایان زمین‌نگار" />
      </div>
    </section>
  );
}
