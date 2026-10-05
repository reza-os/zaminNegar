import {
  ArrowLeft,
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  MapPinned,
  Phone,
  Ruler,
  ShieldCheck,
  Target,
  UsersRound,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { company } from '../config/company';

const serviceIcons = [Ruler, MapPinned, ShieldCheck, BarChart3];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f4f8fb] text-slate-900" dir="rtl">
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
              <MapPinned size={26} />
            </div>
            <div>
              <div className="text-xl font-black text-slate-950">{company.name}</div>
              <div className="text-xs font-medium text-slate-500">{company.slogan}</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-bold text-slate-600 md:flex">
            <a href="#services" className="hover:text-emerald-700">خدمات</a>
            <a href="#system" className="hover:text-emerald-700">سامانه</a>
            <a href="#contact" className="hover:text-emerald-700">تماس</a>
          </nav>

          <Link
            to="/login"
            className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700"
          >
            ورود به سامانه
          </Link>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#bbf7d0,transparent_35%),radial-gradient(circle_at_bottom_right,#bfdbfe,transparent_35%)]" />

          <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
            <div>
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-black text-emerald-700 shadow-sm">
                <CheckCircle2 size={18} />
                شرکت تخصصی نقشه‌برداری و مدیریت اراضی
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-[1.35] text-slate-950 md:text-6xl">
                {company.heroTitle}
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-9 text-slate-600">
                {company.heroText}
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href="#contact"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-7 py-4 text-base font-black text-white shadow-xl shadow-emerald-600/20 transition hover:bg-emerald-700"
                >
                  درخواست مشاوره
                  <ArrowLeft size={20} />
                </a>

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-7 py-4 text-base font-black text-slate-700 transition hover:border-emerald-300 hover:text-emerald-700"
                >
                  ورود پرسنل
                </Link>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-3 gap-3">
                {[
                  ['پرونده قابل پیگیری', '+۱۰۰۰'],
                  ['گزارش مدیریتی', '+۲۰'],
                  ['ثبت و جستجوی سریع', '۲۴/۷'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-3xl border border-white bg-white/80 p-4 text-center shadow-sm">
                    <div className="text-2xl font-black text-emerald-700">{value}</div>
                    <div className="mt-1 text-xs leading-5 text-slate-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute -right-5 -top-5 h-24 w-24 rounded-full bg-emerald-300/40 blur-2xl" />
              <div className="absolute -bottom-5 -left-5 h-32 w-32 rounded-full bg-blue-300/40 blur-2xl" />

              <div className="relative rounded-[2rem] border border-white bg-white/90 p-5 shadow-2xl shadow-slate-200">
                <div className="rounded-[1.5rem] bg-slate-950 p-6 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-slate-300">سامانه داخلی شرکت</div>
                      <div className="mt-2 text-2xl font-black">مدیریت پرونده‌های نقشه‌برداری</div>
                    </div>
                    <div className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
                      <BarChart3 />
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <div className="rounded-3xl bg-white/10 p-4">
                      <div className="text-xs text-slate-300">پرونده‌های فعال</div>
                      <div className="mt-2 text-3xl font-black">۸۶</div>
                    </div>
                    <div className="rounded-3xl bg-emerald-500 p-4">
                      <div className="text-xs text-emerald-50">تکمیل‌شده</div>
                      <div className="mt-2 text-3xl font-black">۱۳۴</div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid gap-3">
                  {company.advantages.slice(0, 4).map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                        <CheckCircle2 size={18} />
                      </span>
                      <span className="text-sm font-bold text-slate-700">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="services" className="mx-auto max-w-7xl px-6 py-20">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-3 text-sm font-black text-emerald-700">خدمات شرکت</div>
            <h2 className="text-3xl font-black text-slate-950 md:text-4xl">
              خدمات تخصصی نقشه‌برداری و مدیریت اراضی
            </h2>
            <p className="mt-4 leading-8 text-slate-600">
              {company.description}
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {company.services.map((service, index) => {
              const Icon = serviceIcons[index] || Target;

              return (
                <div
                  key={service.title}
                  className="rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-200"
                >
                  <div className="mb-5 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <Icon size={28} />
                  </div>
                  <h3 className="text-lg font-black">{service.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{service.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section id="system" className="bg-slate-950 py-20 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2 lg:items-center">
            <div>
              <div className="mb-3 text-sm font-black text-emerald-400">سامانه اختصاصی شرکت</div>
              <h2 className="text-3xl font-black md:text-4xl">
                ثبت، پیگیری و گزارش‌گیری پرونده‌ها در یک داشبورد
              </h2>
              <p className="mt-5 leading-9 text-slate-300">
                کارمندان شرکت می‌توانند اطلاعات کشاورزان و پرونده‌ها را به صورت دستی یا از طریق اکسل وارد کنند.
                مدیر نیز می‌تواند فعالیت هر کارمند، تاریخ ثبت اطلاعات، وضعیت پرونده‌ها و گزارش‌های کلی را مشاهده کند.
              </p>
            </div>

            <div className="grid gap-4">
              {[
                ['ثبت دستی اطلاعات کشاورز', UsersRound],
                ['ورود گروهی اطلاعات از اکسل', FileSpreadsheet],
                ['گزارش فعالیت کارمندان', ShieldCheck],
              ].map(([title, Icon]) => {
                const RealIcon = Icon as typeof UsersRound;

                return (
                  <div key={title as string} className="flex items-center gap-4 rounded-3xl bg-white/10 p-5">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-300">
                      <RealIcon />
                    </div>
                    <div className="font-black">{title as string}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="contact" className="mx-auto max-w-7xl px-6 py-20">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-[2rem] bg-emerald-600 p-8 text-white shadow-2xl shadow-emerald-600/20 lg:col-span-2">
              <h2 className="text-3xl font-black">برای ثبت یا پیگیری امور نقشه‌برداری تماس بگیرید</h2>
              <p className="mt-4 max-w-3xl leading-8 text-emerald-50">
                اطلاعات تماس شرکت را در فایل تنظیمات وارد کنید تا این بخش به صورت واقعی نمایش داده شود.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={`tel:${company.phone}`}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-7 py-4 font-black text-emerald-700"
                >
                  <Phone size={20} />
                  {company.phone}
                </a>

                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/40 px-7 py-4 font-black text-white"
                >
                  ورود به سامانه پرسنل
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-100 bg-white p-8 shadow-sm">
              <h3 className="text-xl font-black">اطلاعات شرکت</h3>
              <div className="mt-6 space-y-4 text-sm leading-7 text-slate-600">
                <div>
                  <div className="font-black text-slate-900">تلفن</div>
                  <div>{company.phone}</div>
                </div>
                <div>
                  <div className="font-black text-slate-900">ایمیل</div>
                  <div>{company.email}</div>
                </div>
                <div>
                  <div className="font-black text-slate-900">آدرس</div>
                  <div>{company.address}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 text-sm text-slate-500 md:flex-row md:items-center md:justify-between">
          <div>© {company.name} - {company.slogan}</div>
          <div>طراحی و توسعه سامانه مدیریت امور نقشه‌برداری</div>
        </div>
      </footer>
    </div>
  );
}
