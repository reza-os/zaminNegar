/**
 * اطلاعات بخش «پروژه‌های اخیر».
 * تصاویر را داخل public/images/projects/ با فرمت WebP قرار دهید.
 * مسیر عکس برای مثال: /images/projects/utm-farm.webp
 * تا زمان درج عکس واقعی image و mobileImage را خالی بگذارید.
 * این سه کارت فقط نمونه نمایشی هستند و ادعای اجرای پروژه واقعی ندارند.
 */
export interface RecentProject {
  id: string;
  title: string;
  category: string;
  description: string;
  /** آدرس تصویر از ریشه public یا URL کامل HTTPS؛ ترجیحاً WebP. */
  image?: string;
  /** تصویر جایگزین کم‌حجم برای موبایل؛ اختیاری. */
  mobileImage?: string;
  imageAlt?: string;
  /** داده‌های اختیاری که فقط پس از تایید واقعیت آن‌ها نمایش داده می‌شوند. */
  location?: string;
  year?: string;
  /** تا زمان ساخت صفحه جزئیات خالی بماند؛ لینک غیرواقعی نمی‌سازیم. */
  href?: string;
}

export const recentProjects: RecentProject[] = [
  {
    id: 'sample-utm',
    title: 'برداشت UTM و تعیین مختصات',
    category: 'نمونه قالب • نقشه‌برداری',
    description: 'این متن و تصویر، پس از اضافه‌شدن اطلاعات پروژه واقعی جایگزین می‌شوند.',
    image: 'images/hero/hero 11.webp',
  },
  {
    id: 'sample-land',
    title: 'برداشت و نقشه‌برداری اراضی',
    category: 'نمونه قالب • اراضی',
    description: 'مشخصات، محل اجرا و تصاویر پروژه را می‌توان از همین فایل تنظیم کرد.',
    image: 'images/hero/hero 11.webp',
  },
  {
    id: 'sample-topography',
    title: 'تهیه نقشه وضع موجود',
    category: 'نمونه قالب • توپوگرافی',
    description: 'با تکمیل نمونه‌کارها، اطلاعات هر پروژه در این قسمت نمایش داده خواهد شد.',
    image: 'images/hero/hero 11.webp',
  },
];

export const recentProjectsSection = {
  eyebrow: 'منتخب فعالیت‌ها',
  title: 'پروژه‌های اخیر',
  description: 'فضایی برای معرفی بخشی از فعالیت‌ها و نمونه‌کارهای نقشه‌برداری زمین‌نگار',
  empty: 'هنوز پروژه‌ای برای نمایش ثبت نشده است.',
} as const;
