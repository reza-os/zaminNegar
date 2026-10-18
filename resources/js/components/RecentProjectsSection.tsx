import { recentProjects, recentProjectsSection } from '../config/recentProjects';
import { ProjectCard } from './ui/project-card';
import './ui/recent-projects.css';

/** بخش پروژه‌های اخیر؛ پس از لوگوهای همراهان در لندینگ. */
export default function RecentProjectsSection() {
  return (
    <section id="recent-projects" aria-labelledby="recent-projects-heading" className="mx-auto max-w-7xl scroll-mt-28 px-4 pb-5 pt-14 sm:px-6 sm:pb-9 sm:pt-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] font-semibold text-emerald-700 sm:text-xs">{recentProjectsSection.eyebrow}</p>
        <h2 id="recent-projects-heading" className="mt-2 text-[22px] font-bold tracking-tight text-slate-900 sm:text-[27px]">{recentProjectsSection.title}</h2>
        <p className="mt-2 text-xs leading-7 text-slate-500 sm:text-[13px]">{recentProjectsSection.description}</p>
      </div>

      {recentProjects.length ? (
        <div className="mx-auto mt-8 grid max-w-[1060px] grid-cols-1 gap-5 sm:mt-10 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {recentProjects.map((project) => <ProjectCard key={project.id} project={project} />)}
        </div>
      ) : (
        <p className="mt-10 text-center text-xs text-slate-500">{recentProjectsSection.empty}</p>
      )}
    </section>
  );
}
