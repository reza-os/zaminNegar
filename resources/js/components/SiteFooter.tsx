import {
  Building2,
  Mail,
  MapPin,
  MessageCircleMore,
  Phone,
  Send,
  ShieldCheck,
} from 'lucide-react';
import { company } from '../config/company';
import { footerContent, type FooterSocialKind } from '../config/footer';
import { siteNavigation } from '../config/navigation';

function FooterLogoMark() {
  if (siteNavigation.logoSrc) {
    return (
      <img
        src={siteNavigation.logoSrc}
        alt={siteNavigation.logoAlt}
        className="h-12 w-12 rounded-2xl object-contain"
        loading="lazy"
      />
    );
  }

  return (
    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-emerald-200">
      <Building2 size={24} />
    </div>
  );
}

/** Inline brand marks avoid lucide-react brand icon exports, which vary by version. */
function InstagramMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.3" />
      <circle cx="12" cy="12" r="4.1" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function LinkedinMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="4.25" cy="4.5" r="2.1" />
      <rect x="2.3" y="9" width="3.9" height="12.5" rx="0.5" />
      <path d="M10 9h3.8v1.7c.8-1.2 2.1-2 3.9-2 3 0 4.3 1.9 4.3 5.2v7.6h-4v-7.1c0-1.5-.5-2.4-1.9-2.4-1.4 0-2.1 1-2.1 2.4v7.1h-4V9Z" />
    </svg>
  );
}

function SocialIcon({ kind }: { kind: FooterSocialKind }) {
  switch (kind) {
    case 'instagram':
      return <InstagramMark />;
    case 'telegram':
      return <Send size={18} />;
    case 'linkedin':
      return <LinkedinMark />;
    case 'whatsapp':
      return <MessageCircleMore size={18} />;
    default:
      return <Send size={18} />;
  }
}

function TrustBadge({ label, imageSrc, href }: { label: string; imageSrc: string; href: string }) {
  const content = imageSrc ? (
    <img src={imageSrc} alt={label} className="h-16 w-16 rounded-2xl object-contain" loading="lazy" />
  ) : (
    <div className="flex h-16 w-16 flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/10 px-2 text-center text-[10px] font-bold leading-4 text-white/70">
      <ShieldCheck className="mb-1 h-4 w-4 text-emerald-300" />
      {label}
    </div>
  );

  if (!href || href === '#') {
    return content;
  }

  return (
    <a href={href} target="_blank" rel="noreferrer" className="transition hover:-translate-y-0.5 hover:opacity-90">
      {content}
    </a>
  );
}

function FooterLinkColumn({ title, links }: { title: string; links: ReadonlyArray<{ label: string; href: string }> }) {
  return (
    <div>
      <h3 className="mb-5 text-base font-extrabold text-white">{title}</h3>
      <ul className="space-y-3 text-sm leading-7 text-slate-200/80">
        {links.map((link) => (
          <li key={link.label}>
            <a href={link.href} className="transition hover:text-white">
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function SiteFooter() {
  return (
    <footer className="px-4 pb-6 pt-16 sm:px-6 lg:px-8 lg:pb-8">
      <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/20 bg-slate-900/75 shadow-[0_24px_80px_-32px_rgba(15,23,42,0.85)] backdrop-blur-2xl">
        <div className="grid gap-10 px-6 py-8 sm:px-8 lg:grid-cols-[1.25fr_0.9fr_0.9fr_1.2fr] lg:px-10 lg:py-10 xl:px-12">
          <div className="order-1 space-y-5">
            <div className="flex items-start gap-4">
              <FooterLogoMark />
              <div>
                <div className="text-lg font-black text-white">{company.name}</div>
                <div className="mt-1 text-sm leading-7 text-slate-200/75">{company.slogan}</div>
              </div>
            </div>

            <p className="max-w-md text-sm leading-8 text-slate-200/85">{footerContent.about}</p>

            <div className="flex flex-wrap gap-3">
              {footerContent.socials.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  target={social.href.startsWith('http') ? '_blank' : undefined}
                  rel={social.href.startsWith('http') ? 'noreferrer' : undefined}
                  className="grid h-11 w-11 place-items-center rounded-2xl border border-white/10 bg-white/10 text-slate-100 transition hover:-translate-y-0.5 hover:border-emerald-300/40 hover:bg-emerald-400/15 hover:text-white"
                >
                  <SocialIcon kind={social.kind} />
                </a>
              ))}
            </div>
          </div>

          <div className="order-3 lg:order-2">
            <FooterLinkColumn title="لینک‌های سریع" links={footerContent.quickLinks} />
          </div>

          <div className="order-4 lg:order-3">
            <FooterLinkColumn title="دسترسی بیشتر" links={footerContent.supportLinks} />
          </div>

          <div className="order-2 lg:order-4">
            <h3 className="mb-5 text-base font-extrabold text-white">تماس با ما</h3>
            <ul className="space-y-4 text-sm leading-8 text-slate-100/90">
              {footerContent.phones.map((phone) => (
                <li key={phone.value} className="flex items-start gap-3">
                  <span className="mt-1 text-emerald-300"><Phone size={18} /></span>
                  <div>
                    <div className="text-white/70">{phone.label}</div>
                    <a href={phone.href} className="font-bold transition hover:text-white">{phone.value}</a>
                  </div>
                </li>
              ))}

              <li className="flex items-start gap-3">
                <span className="mt-1 text-emerald-300"><Mail size={18} /></span>
                <div>
                  <div className="text-white/70">{footerContent.email.label}</div>
                  <a href={footerContent.email.href} className="font-bold transition hover:text-white">{footerContent.email.value}</a>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <span className="mt-1 text-emerald-300"><MapPin size={18} /></span>
                <div>
                  <div className="text-white/70">آدرس دفتر</div>
                  <p>{footerContent.address}</p>
                </div>
              </li>
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              {footerContent.trustBadges.map((badge) => (
                <TrustBadge key={badge.label} {...badge} />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/10 px-6 py-5 text-sm text-slate-200/70 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:px-10 xl:px-12">
          <div>{footerContent.copyright}</div>
          <div>{footerContent.credit}</div>
        </div>
      </div>
    </footer>
  );
}
