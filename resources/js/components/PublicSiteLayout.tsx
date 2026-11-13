import type { ReactNode } from 'react';
import SiteHeader from './SiteHeader';
import SiteFooter from './SiteFooter';
import './public-site.css';

/** پوسته عمومی مشترک؛ هیچ تغییری در صفحات خصوصی و داشبورد ایجاد نمی‌کند. */
export default function PublicSiteLayout({ children }: { children: ReactNode }) {
  return <div className="zn-public-site min-h-screen" dir="rtl">
    <SiteHeader />
    {children}
    <SiteFooter />
  </div>;
}
