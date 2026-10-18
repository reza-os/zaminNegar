/**
 * تنظیمات بنر تمام‌صفحه زمین‌نگار — برای اضافه‌کردن تصویر یا متن جدید فقط این فایل را ویرایش کنید.
 * هر عکس را به WebP تبدیل کرده و داخل public/images/hero/ قرار دهید.
 * آدرس /images/hero/x.webp از پوشه public به صورت عمومی در دسترس قرار می‌گیرد.
 */
export interface HeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  /** تصویر عمودی موبایل (اختیاری؛ در صورت خالی بودن از image استفاده می‌شود) */
  mobileImage?: string;
  alt: string;
}

export const heroSettings = {
  autoplayMs: 7000, // مقدار 0 = توقف پخش خودکار
  durationMs: 1350, // زمان افکت گسترش جوهر
  bleed: 46, // شدت ناهمواری لبه لکه (بیشتر = پردازش بیشتر)
  /** تا زمان ساخت صفحه درخواست عمومی، دکمه اصلی به بخش تماس می‌رود؛ بعداً فقط href را عوض کنید. */
  primaryAction: { label: 'درخواست تشکیل پرونده', href: '#contact' },
  secondaryAction: { label: 'ورود پرسنل', href: '/login' },
} as const;

/** برای افزودن اسلاید، یک شیء جدید با شناسه یکتا به این آرایه اضافه کنید. */
export const heroSlides: HeroSlide[] = [
  {
    id: 'surveying',
    eyebrow: 'زمین‌نگار | نقشه‌برداری حرفه‌ای',
    title: 'دقت در هر نقطه، اطمینان در هر تصمیم',
    description: 'از برداشت زمینی تا تهیه نقشه‌های دقیق؛ همراه پروژه‌های عمرانی، ملکی و کشاورزی.',
    image: '/images/hero/hero 11.webp',
    mobileImage: '/images/hero/01-survey-mobile.webp',
    alt: 'طرح موقت خطوط توپوگرافی و نقاط اندازه‌گیری',
  },
  {
    id: 'utm',
    eyebrow: 'خدمات تعیین موقعیت و مختصات',
    title: 'مرزهای روشن با مختصات دقیق',
    description: 'برداشت UTM و مستندسازی موقعیت زمین، باغ و ملک با رویکردی فنی و منظم.',
    image: '/images/hero/hero2.webp',
    mobileImage: '/images/hero/02-utm-mobile.webp',
    alt: 'طرح موقت شبکه مختصات و نشانه‌های زمین',
  },
  {
    id: 'cadastre',
    eyebrow: 'امور ثبتی و مدیریت اراضی',
    title: 'از شناخت زمین تا شفافیت اطلاعات',
    description: 'تهیه داده‌ها و نقشه‌های مورد نیاز برای سامان‌دهی امور ثبتی و کاداستر.',
    image: '/images/hero/hero3.webp',
    mobileImage: '/images/hero/03-cadastre-mobile.webp',
    alt: 'طرح موقت نقشه قطعه‌بندی زمین و مرزبندی اراضی',
  },
  {
    id: 'farmland',
    eyebrow: 'زمین، کشاورزی و آینده',
    title: 'نگاهی دقیق‌تر به ارزش زمین',
    description: 'ثبت و مدیریت اطلاعات مزارع، باغ‌ها و پرونده‌های اراضی در کنار خدمات میدانی.',
    image: '/images/hero/hero4.webp',
    mobileImage: '/images/hero/04-farmland-mobile.webp',
    alt: 'طرح موقت الگوی هندسی قطعات کشاورزی',
  },
];
