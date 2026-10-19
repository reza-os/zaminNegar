export const footerContent = {
  about:
    'شرکت زمین‌نگار ارائه‌دهنده خدمات تخصصی نقشه‌برداری، برداشت UTM، امور ثبتی و مدیریت پرونده‌های اراضی است. این بخش را می‌توانید بعداً با معرفی واقعی شرکت تکمیل کنید.',
  quickLinks: [
    { label: 'خانه', href: '#hero' },
    { label: 'معرفی شرکت', href: '#showcase' },
    { label: 'خدمات', href: '#services' },
    { label: 'سامانه', href: '#system' },
    { label: 'ثبت درخواست', href: '#contact' },
  ],
  supportLinks: [
    { label: 'خدمات نقشه‌برداری', href: '#services' },
    { label: 'پروژه‌های اخیر', href: '#recent-projects' },
    { label: 'همراهان و کارفرمایان', href: '#partners' },
    { label: 'فرم درخواست تشکیل پرونده', href: '#contact' },
  ],
  phones: [
    { label: 'فروش و مشاوره', value: '۰۹۱۲-۰۰۰-۰۰۰۰', href: 'tel:09120000000' },
    { label: 'دفتر مرکزی', value: '۰۲۱-۴۴۴۴۴۴۴۴', href: 'tel:02144444444' },
  ],
  email: { label: 'ایمیل', value: 'info@zaminnegar.local', href: 'mailto:info@zaminnegar.local' },
  address: 'تهران، آدرس دفتر مرکزی شرکت زمین‌نگار در این بخش قرار می‌گیرد.',
  socials: [
    { label: 'اینستاگرام', href: '#', kind: 'instagram' },
    { label: 'تلگرام', href: '#', kind: 'telegram' },
    { label: 'لینکدین', href: '#', kind: 'linkedin' },
    { label: 'واتساپ', href: '#', kind: 'whatsapp' },
  ],
  trustBadges: [
    { label: 'نماد اعتماد', imageSrc: '', href: '#' },
    { label: 'لوگوی مجوز / اتحادیه', imageSrc: '', href: '#' },
  ],
  copyright: 'تمامی حقوق این وب‌سایت برای شرکت زمین‌نگار محفوظ است.',
  credit: 'طراحی و توسعه با تمرکز بر سرعت، سادگی و قابلیت توسعه.',
} as const;

export type FooterSocialKind = (typeof footerContent.socials)[number]['kind'];
