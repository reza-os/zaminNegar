import * as React from 'react';
import { Building2 } from 'lucide-react';
import { CoverflowCarousel } from './ui/coverflow-carousel';
import { partnerBrands, partnersSection } from '../config/partners';
import './partners-section.css';

/** سمت راست: نام متحرک سازمان منتخب؛ سمت چپ: کارت‌های قابل پیمایش لوگو. */
export default function PartnersSection() {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const selected = partnerBrands[activeIndex] ?? partnerBrands[0];
  if (!selected) return null;

  return (
    <section id="partners" aria-labelledby="partners-heading" className="zpp-section" dir="rtl">
      <div className="zpp-inner">
        <header className="zpp-heading">
          <span className="zpp-eyebrow"><Building2 size={15} aria-hidden="true" />{partnersSection.eyebrow}</span>
          <h2 id="partners-heading">{partnersSection.title}</h2>
          <p>{partnersSection.description}</p>
          <div className="zpp-selected" aria-live="polite" aria-atomic="true">
            <span className="zpp-selected-label">سازمان منتخب</span>
            <strong key={selected.id} className="zpp-selected-name">{selected.name}</strong>
            <span className="zpp-selected-stroke" aria-hidden="true" />
          </div>
        </header>
        <div className="zpp-slider-wrap">
          <CoverflowCarousel
            slides={partnerBrands.map((brand) => ({
              id: brand.id,
              src: brand.logoSrc,
              alt: brand.logoAlt,
              title: brand.name,
              darkLogo: brand.darkLogo,
            }))}
            label="لوگوهای سازمان‌ها و کارفرمایان زمین‌نگار"
            rotate={0}
            autoplayMs={5500}
            onActiveChange={setActiveIndex}
          />
        </div>
      </div>
    </section>
  );
}
