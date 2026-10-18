import * as React from 'react';
import { Link } from 'react-router-dom';
import { LogIn, MapPinned, Menu, X } from 'lucide-react';
import { company } from '../config/company';
import { navigationItems, siteNavigation } from '../config/navigation';
import { BottomNavBar, navigationIcons } from './ui/bottom-nav-bar';

/** نوار شیشه‌ای روی هیرو؛ در صفحه ورود و داشبورد استفاده نمی‌شود. */
export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [activeId, setActiveId] = React.useState<string>(() =>
    typeof window === 'undefined' ? 'hero' : window.location.hash.slice(1) || 'hero',
  );
  const [scrolled, setScrolled] = React.useState(false);
  const [logoFailed, setLogoFailed] = React.useState(false);
  const menuId = React.useId();

  React.useEffect(() => {
    // Passive listener: only update state when we cross the threshold.
    const updateScroll = () => setScrolled(window.scrollY > 32);
    updateScroll();
    window.addEventListener('scroll', updateScroll, { passive: true });
    return () => window.removeEventListener('scroll', updateScroll);
  }, []);

  React.useEffect(() => {
    const nodes = navigationItems
      .map((item) => document.getElementById(item.id))
      .filter((node): node is HTMLElement => Boolean(node));
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => {
      const intersecting = entries.filter((entry) => entry.isIntersecting);
      if (intersecting.length) {
        intersecting.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        setActiveId(intersecting[0].target.id);
      }
    }, { rootMargin: '-14% 0px -65% 0px', threshold: [0, .25, .5] });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  React.useEffect(() => {
    if (!menuOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  return (
    <header className={`zng-header ${scrolled ? 'zng-header--scrolled' : ''}`} dir="rtl">
      <div className="zng-header-inner">
        <Link to="/" className="zng-brand" aria-label={`صفحه اصلی ${company.name}`} onClick={() => setMenuOpen(false)}>
          <span className="zng-brand-symbol">
            {siteNavigation.logoSrc && !logoFailed ? (
              <img
                src={siteNavigation.logoSrc}
                alt={siteNavigation.logoAlt}
                className="zng-brand-logo"
                width={48}
                height={48}
                decoding="async"
                onError={() => setLogoFailed(true)}
              />
            ) : (
              <MapPinned size={26} strokeWidth={1.8} aria-hidden="true" />
            )}
          </span>
          {siteNavigation.showCompanyName && (
            <span className="zng-brand-label">
              <strong className="zng-brand-name">{company.name}</strong>
              {siteNavigation.showSlogan && <span className="zng-brand-slogan">{company.slogan}</span>}
            </span>
          )}
        </Link>

        <BottomNavBar
          activeId={activeId}
          onNavigate={(item) => { setActiveId(item.id); setMenuOpen(false); }}
        />

        <div className="zng-header-actions">
          <Link to={siteNavigation.loginHref} className="zng-login">
            <LogIn size={17} aria-hidden="true" />
            <span>{siteNavigation.loginLabel}</span>
          </Link>
          <button
            type="button"
            className="zng-mobile-toggle"
            aria-label={menuOpen ? 'بستن فهرست' : 'باز کردن فهرست'}
            aria-controls={menuId}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((previous) => !previous)}
          >
            {menuOpen ? <X size={22} aria-hidden="true" /> : <Menu size={22} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id={menuId} className="zng-mobile-panel" aria-label="فهرست موبایل">
          {navigationItems.map((item) => {
            const Icon = navigationIcons[item.id] || MapPinned;
            return (
              <a
                key={item.id}
                href={item.href}
                aria-current={activeId === item.id ? 'location' : undefined}
                className={`zng-mobile-link ${activeId === item.id ? 'zng-mobile-link--active' : ''}`}
                onClick={() => { setActiveId(item.id); setMenuOpen(false); }}
              >
                <Icon size={17} aria-hidden="true" />
                {item.label}
              </a>
            );
          })}
        </nav>
      )}
    </header>
  );
}
