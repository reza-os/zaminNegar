/** Navigation shared by the public landing, about and services pages. */
export const siteNavigation = {
  logoSrc: '/images/brand/logo.webp',
  logoAlt: 'لوگوی شرکت زمین‌نگار',
  showCompanyName: true,
  showSlogan: true,
  loginLabel: 'ورود به سامانه',
  loginHref: '/login',
} as const;

export const navigationItems = [
  { id: 'hero', label: 'خانه', href: '/' },
  { id: 'showcase', label: 'معرفی شرکت', href: '/about' },
  { id: 'services', label: 'خدمات', href: '/services' },
  { id: 'system', label: 'سامانه', href: '/#system' },
  { id: 'contact', label: 'ثبت درخواست', href: '/#contact' },
] as const;
export type NavigationItem = (typeof navigationItems)[number];
