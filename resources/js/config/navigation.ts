/**
 * تنظیمات نوار بالای صفحه اصلی زمین‌نگار.
 * برای لوگو: فایل WebP یا SVG را در public/images/brand/ قرار دهید و فقط logoSrc را عوض کنید.
 * یک مسیر با / شروع می‌شود و مستقیماً از پوشه public سرو می‌شود.
 * وقتی logoSrc خالی است، آیکون موقت نقشه نمایش داده می‌شود و درخواست عکس ناموجود ارسال نمی‌شود.
 */
export const siteNavigation = {
  logoSrc: '/images/brand/logo.webp',
  logoAlt: 'نشان شرکت زمین‌نگار',
  showCompanyName: true,
  showSlogan: true,
  loginLabel: 'ورود به سامانه',
  loginHref: '/login',
} as const;

/** لینک‌ها و ترتیب منوی دسکتاپ و موبایل در یک محل قابل تغییرند. */
export const navigationItems = [
  { id: 'hero', label: 'خانه', href: '#hero' },
  { id: 'showcase', label: 'معرفی شرکت', href: '#showcase' },
  { id: 'services', label: 'خدمات', href: '#services' },
  { id: 'system', label: 'سامانه', href: '#system' },
  { id: 'contact', label: 'ثبت درخواست', href: '#contact' },
] as const;

export type NavigationItem = (typeof navigationItems)[number];
