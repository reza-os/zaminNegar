import * as React from 'react';
import './spotlight-card.css';

type GlowColor = 'blue' | 'purple' | 'green' | 'red' | 'orange';

export interface GlowCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowColor?: GlowColor;
  /** کارت در حالت پیش‌فرض با عرض ۱۰۰٪ ظرف خود نمایش داده می‌شود. */
  width?: number | string;
  height?: number | string;
}

/**
 * اقتباس سبک از GlowCard؛ بدون listener روی document، پکیج انیمیشن یا state اضافی.
 * رویداد و جلوه فقط روی کارت زیر نشانگر فعال می‌شود.
 */
export const GlowCard = React.forwardRef<HTMLDivElement, GlowCardProps>(
  ({ children, className = '', glowColor = 'green', width, height, style, onPointerMove, ...props }, ref) => {
    const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerType === 'mouse' || event.pointerType === 'pen') {
        const rect = event.currentTarget.getBoundingClientRect();
        event.currentTarget.style.setProperty('--zg-x', `${event.clientX - rect.left}px`);
        event.currentTarget.style.setProperty('--zg-y', `${event.clientY - rect.top}px`);
      }
      onPointerMove?.(event);
    };

    return (
      <div
        {...props}
        ref={ref}
        onPointerMove={onMove}
        data-zg-glow={glowColor}
        className={`zg-glow-card ${className}`}
        style={{ width, height, ...style }}
      >
        {children}
      </div>
    );
  },
);

GlowCard.displayName = 'GlowCard';
