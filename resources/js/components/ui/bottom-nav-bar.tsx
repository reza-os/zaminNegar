import { Link } from 'react-router-dom';
import {
  Building2,
  Home,
  Layers3,
  MapPinned,
  PhoneCall,
  type LucideIcon,
} from 'lucide-react';
import { navigationItems, type NavigationItem } from '../../config/navigation';
import './bottom-nav-bar.css';

/**
 * نسخه مخصوص وب‌سایت زمین‌نگار از ایده BottomNavBar:
 * آیتم فعال به‌شکل کپسولی روشن می‌شود، اما منو در بالای سایت استفاده می‌شود.
 * بر خلاف نمونه مالی اصلی، هر آیتم یک لینک واقعی به بخش لندینگ است.
 */
export const navigationIcons: Record<string, LucideIcon> = {
  hero: Home,
  showcase: Building2,
  services: MapPinned,
  system: Layers3,
  contact: PhoneCall,
};

export type BottomNavBarProps = {
  className?: string;
  activeId?: string;
  items?: readonly NavigationItem[];
  onNavigate?: (item: NavigationItem) => void;
  ariaLabel?: string;
};

export function BottomNavBar({
  className = '',
  activeId = 'hero',
  items = navigationItems,
  onNavigate,
  ariaLabel = 'پیمایش بخش‌های سایت',
}: BottomNavBarProps) {
  return (
    <nav className={`zng-pill-nav ${className}`} aria-label={ariaLabel}>
      {items.map((item) => {
        const Icon = navigationIcons[item.id] || Home;
        const isActive = activeId === item.id;
        return (
          <Link
            key={item.id}
            to={item.href}
            className={`zng-pill-link ${isActive ? 'zng-pill-link--active' : ''}`}
            aria-current={isActive ? (item.href === '/about' || item.href === '/services' || item.href === '/' ? 'page' : 'location') : undefined}
            onClick={() => onNavigate?.(item)}
          >
            <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default BottomNavBar;
