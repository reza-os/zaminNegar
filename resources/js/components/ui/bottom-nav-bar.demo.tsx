import { BottomNavBar } from './bottom-nav-bar';

/** نمایش مستقل لینک‌های کپسولی روی زمینه تیره؛ در LandingPage از SiteHeader استفاده شده است. */
export default function Demo() {
  return (
    <div dir="rtl" style={{ background: '#0d363f', padding: 32, display: 'flex', justifyContent: 'center' }}>
      <BottomNavBar activeId="hero" />
    </div>
  );
}
