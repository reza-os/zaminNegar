/**
 * محتوای اسلایدر صفحه اصلی زمین‌نگار.
 * برای جایگزینی تصاویر در آینده، فقط مقدار image هر اسلاید را با مسیر فایل تغییر دهید؛
 * مثال: image: '/images/landing/utm.webp'
 * فایل‌های تصویر را در public/images/landing قرار دهید.
 */
export type SliderVisual = 'terrain' | 'utm' | 'cadastre' | 'farmland' | 'dashboard';

export interface LandingSlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  category: string;
  image?: string;
  imageAlt?: string;
  visual: SliderVisual;
  href: string;
  linkLabel: string;
}

/** لوگوی اختصاصی پس از آماده شدن در این مسیر قرار می‌گیرد. */
export const landingSliderBrandLogo = ''; // example: '/images/brand/logo-light.svg'

export const landingSlides: LandingSlide[] = [
  {
    id: 'surveying',
    eyebrow: '۰۱ / نقشه‌برداری دقیق',
    title: 'هر نقطه، آغاز یک تصمیم مطمئن',
    description: 'برداشت زمینی، تهیه نقشه وضع موجود و تبدیل داده‌های میدانی به اطلاعات کاربردی برای پروژه‌های شما.',
    category: 'نقشه‌برداری اراضی',
    image: 'images/hero/hero2.webp',
    imageAlt: 'تیم نقشه‌برداری در حال برداشت زمینی',
    visual: 'terrain',
    href: '#services',
    linkLabel: 'آشنایی با خدمات',
  },
  {
    id: 'utm',
    eyebrow: '۰۲ / تعیین موقعیت',
    title: 'مختصات دقیق، مرزهای روشن',
    description: 'برداشت و تهیه مختصات UTM برای زمین‌ها، باغ‌ها و املاک با رویکردی دقیق و مستند.',
    category: 'برداشت UTM',
    image: 'images/hero/hero 11.webp',
    imageAlt: 'تصویر تجهیزات تعیین مختصات UTM در زمین',
    visual: 'utm',
    href: '#services',
    linkLabel: 'مشاهده حوزه خدمات',
  },
  {
    id: 'cadastre',
    eyebrow: '۰۳ / اسناد و اراضی',
    title: 'از اندازه‌گیری تا شفافیت مالکیت',
    description: 'آماده‌سازی نقشه‌ها و داده‌های مکانی مورد نیاز در امور ثبتی، کاداستر و پرونده‌های ملکی.',
    category: 'امور ثبتی و کاداستر',
    image: 'images/hero/hero3.webp',
    imageAlt: 'نمایی از نقشه کاداستر و قطعه‌بندی زمین',
    visual: 'cadastre',
    href: '#services',
    linkLabel: 'درباره خدمات ثبتی',
  },
  {
    id: 'farmland',
    eyebrow: '۰۴ / زمین و کشاورزی',
    title: 'شناخت بهتر زمین، مدیریت بهتر آینده',
    description: 'برداشت و مستندسازی قطعات کشاورزی برای سامان‌دهی اطلاعات مزارع، باغ‌ها و بهره‌برداران.',
    category: 'اراضی کشاورزی',
    image: 'images/hero/hero4.webp',
    imageAlt: 'نمایی هوایی از مرزبندی مزارع و باغ‌ها',
    visual: 'farmland',
    href: '#contact',
    linkLabel: 'درخواست مشاوره',
  },
  {
    id: 'workflow',
    eyebrow: '۰۵ / مدیریت یکپارچه',
    title: 'داده‌های منظم، پیگیری هوشمند',
    description: 'ثبت، جستجو، پیگیری و گزارش‌گیری پرونده‌ها در سامانه اختصاصی زمین‌نگار؛ از میدان تا دفتر.',
    category: 'سامانه مدیریت پرونده‌ها',
    image: 'images/hero/hero1.webp',
    imageAlt: 'نمایی از سامانه مدیریت پرونده‌های نقشه‌برداری',
    visual: 'dashboard',
    href: '#system',
    linkLabel: 'معرفی سامانه',
  },
];
