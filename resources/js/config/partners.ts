/**
 * تنها شرکای تاییدشده‌ای که نشان آن‌ها توسط تیم زمین‌نگار ارسال شده است.
 * متن جدا از لوگوی اصلی در تصویر ذخیره نشده؛ عنوان سازمان زیر کارت می‌آید.
 */
export type PartnerBrand = {
  id: string;
  name: string;
  logoSrc: string;
  logoAlt?: string;
  /** بعضی لوگوها (مثلاً نشان سفید دانشگاه) زمینهٔ تیره نیاز دارند. */
  darkLogo?: boolean;
};

export const partnerBrands: PartnerBrand[] = [
  {
    id: 'khuzestan-heritage',
    name: 'اداره کل میراث فرهنگی، گردشگری و صنایع دستی استان خوزستان',
    logoSrc: '/images/partners/khuzestan-cultural-heritage.webp',
    logoAlt: 'نشان اداره کل میراث فرهنگی، گردشگری و صنایع دستی خوزستان',
  },
  {
    id: 'isfahan-university',
    name: 'دانشگاه اصفهان',
    logoSrc: '/images/partners/university-of-isfahan.webp',
    logoAlt: 'نشان و نوشتار رسمی دانشگاه اصفهان',
    darkLogo: true,
  },
  {
    id: 'khuzestan-jihad',
    name: 'سازمان جهاد کشاورزی استان خوزستان',
    logoSrc: '/images/partners/khuzestan-agriculture-jihad.webp',
    logoAlt: 'نشان سازمان جهاد کشاورزی استان خوزستان',
  },
];

export const partnersSection = {
  eyebrow: 'همکاری‌ها',
  title: 'سازمان‌ها و کارفرمایان ما',
  description: 'برخی از مجموعه‌هایی که به خدمات زمین‌نگار اعتماد کرده‌اند.',
} as const;
