import { ArrowLeft, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface Props {
  category: string;
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  icon: LucideIcon;
  variant: 'about' | 'services';
}

/** صفحه‌های داخلی: تصویر و روایت اختصاصی در کنار فوتر و نوار مشترک */
export default function InteriorHero({ category, title, description, image, imageAlt, icon: Icon, variant }: Props) {
  return <section className={`zn-interior-hero zn-interior-hero--${variant}`} aria-labelledby={`${variant}-hero-heading`}>
    <div className="zn-interior-hero-photo"><img src={image} alt={imageAlt} fetchPriority="high" /></div>
    <div className="zn-interior-hero-shade" aria-hidden="true" />
    <div className="zn-interior-hero-content">
      <div className="zn-interior-breadcrumb"><Link to="/">خانه</Link><span aria-hidden="true">/</span><span>{category}</span></div>
      <span className="zn-interior-eyebrow"><Icon size={18} aria-hidden="true" />{category}</span>
      <h1 id={`${variant}-hero-heading`}>{title}</h1>
      <p>{description}</p>
      <div className="zn-interior-hero-actions">
        <Link to="/#contact" className="zn-btn-primary">ثبت درخواست خدمات <ArrowLeft size={17} aria-hidden="true" /></Link>
        <Link to={variant === 'about' ? '/services' : '/about'} className="zn-btn-outline">{variant === 'about' ? 'خدمات ما' : 'آشنایی با شرکت'}</Link>
      </div>
    </div>
  </section>;
}
