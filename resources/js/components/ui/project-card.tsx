import { ArrowUpLeft, Image as ImageIcon, MapPin, CalendarDays, ScanLine } from 'lucide-react';
import type { RecentProject } from '../../config/recentProjects';
import { GlowCard } from './spotlight-card';

interface ProjectCardProps { project: RecentProject; }

/** تبدیل چیدمان MenuItemCard به کارت پروژه‌های تخصصی نقشه‌برداری. */
export function ProjectCard({ project }: ProjectCardProps) {
  const hasImage = Boolean(project.image?.trim());
  const hasMobileImage = Boolean(project.mobileImage?.trim());
  const alt = project.imageAlt || `تصویر پروژه ${project.title}`;

  return (
    <GlowCard glowColor="green" className="group flex h-full min-w-0 flex-col overflow-hidden p-2.5 sm:p-3">
      <div className="relative isolate aspect-[16/10] overflow-hidden rounded-[14px] bg-gradient-to-br from-slate-100 via-[#edf6f3] to-emerald-50">
        {hasImage ? (
          <picture>
            {hasMobileImage && <source media="(max-width: 639px)" srcSet={project.mobileImage} />}
            <img
              src={project.image}
              alt={alt}
              loading="lazy"
              decoding="async"
              sizes="(max-width: 639px) calc(100vw - 48px), (max-width: 1023px) 44vw, 30vw"
              width="720"
              height="450"
              draggable={false}
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-[1.035]"
            />
          </picture>
        ) : (
          <div className="relative grid h-full w-full place-items-center" aria-label="جایگاه تصویر پروژه">
            <div className="zg-map-placeholder absolute inset-0" aria-hidden="true" />
            <div className="relative z-10 flex flex-col items-center gap-2 text-emerald-800/65">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-emerald-800/10 bg-white/50 backdrop-blur-[2px]">
                <ScanLine size={23} strokeWidth={1.3} />
              </div>
              <span className="text-[11px] font-medium">جایگاه تصویر پروژه</span>
            </div>
          </div>
        )}
        <span className="absolute bottom-3 right-3 rounded-full border border-white/70 bg-white/85 px-2.5 py-1 text-[10px] font-medium text-slate-700 backdrop-blur-sm">
          {project.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 px-2.5 pb-2 pt-4 sm:px-3">
        <h3 className="text-[15px] font-bold leading-7 text-slate-900 sm:text-base">{project.title}</h3>
        <p className="line-clamp-2 min-h-[42px] text-xs leading-[1.9] text-slate-500">{project.description}</p>
        {(project.location || project.year) && (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-slate-500">
            {project.location && <span className="inline-flex items-center gap-1"><MapPin size={13} aria-hidden="true" />{project.location}</span>}
            {project.year && <span className="inline-flex items-center gap-1"><CalendarDays size={13} aria-hidden="true" />{project.year}</span>}
          </div>
        )}
        <div className="mt-auto border-t border-slate-100 pt-3 text-xs">
          {project.href ? (
            <a href={project.href} className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 transition-colors hover:text-emerald-900 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600">
              مشاهده جزئیات <ArrowUpLeft size={15} aria-hidden="true" />
            </a>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-slate-400"><ImageIcon size={14} aria-hidden="true" />جزئیات پس از تکمیل پروژه</span>
          )}
        </div>
      </div>
    </GlowCard>
  );
}
