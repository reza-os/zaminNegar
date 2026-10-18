/**
 * لوگوهای همکاران و کارفرمایان زمین‌نگار.
 * مسیرهای شروع‌شده با / از داخل پوشه public خوانده می‌شوند.
 * تا زمانی که لوگو را ندارید، logoSrc را خالی بگذارید؛ در نتیجه هیچ درخواست 404 ایجاد نمی‌شود.
 * برای افزودن لوگو، یک عضو دیگر به آرایه اضافه کنید.
 */
export type PartnerBrand = {
  id: string;
  name: string;
  logoSrc: string;
  logoAlt?: string;
};

/** موارد فعلی صرفاً جایگاه موقت هستند، نه اسامی همکاران واقعی شرکت. */
export const partnerBrands: PartnerBrand[] = [
  { id: 'partner-01', name: 'همکار ۰۱', logoSrc: 'images/partners/logo.webp' },
  { id: 'partner-02', name: 'همکار ۰۲', logoSrc: 'images/partners/logo copy.webp' },
  { id: 'partner-03', name: 'همکار ۰۳', logoSrc: 'images/partners/logo copy.webp' },
  { id: 'partner-04', name: 'همکار ۰۴', logoSrc: 'images/partners/logo copy.webp' },
  { id: 'partner-05', name: 'همکار ۰۵', logoSrc: 'images/partners/logo copy.webp' },
  { id: 'partner-06', name: 'همکار ۰۶', logoSrc: 'images/partners/logo copy.webp' },
];

export const partnersSection = {
  eyebrow: 'همکاری‌ها',
  title: 'همراهان و کارفرمایان',
  description: 'برخی از مجموعه‌هایی که در مسیر پروژه‌ها کنار ما بوده‌اند',
} as const;
