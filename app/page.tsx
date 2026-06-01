import { Icon } from "@iconify/react";
import Link from "next/link";

export default function Home() {
  return (
    <main className="bg-white dark:bg-gray-900 overflow-hidden">
      {/* ============================================================
          HERO
      ============================================================ */}
      <section className="relative min-h-[90vh] flex items-center py-0">
        {/* Background layers */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          {/* Dot grid pattern */}
          <div
            className="absolute inset-0 opacity-[0.035] dark:opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #004a98 1.5px, transparent 1.5px)",
              backgroundSize: "28px 28px",
            }}
          />
          {/* Diagonal soft panel */}
          <div className="absolute right-0 top-0 w-[52%] h-full bg-gradient-to-bl from-primary/6 via-primary/3 to-transparent dark:from-primary/12 dark:via-primary/6" />
          {/* Orange accent glow */}
          <div className="absolute right-[8%] top-[12%] w-80 h-80 bg-secondary/12 dark:bg-secondary/18 rounded-full blur-[80px]" />
          {/* Blue bottom glow */}
          <div className="absolute left-[15%] bottom-[8%] w-[500px] h-52 bg-primary/6 dark:bg-primary/12 rounded-full blur-[80px]" />
        </div>

        <div className="relative z-10 container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 pt-28 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-6 items-center">
            {/* Left: Copy */}
            <div className="col-span-6 flex flex-col gap-6 animate-fade-up">
              {/* Eyebrow */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-[3px] bg-secondary rounded-full" />
                <span className="text-secondary text-xs font-bold uppercase tracking-[0.18em]">
                  INADEH — República de Panamá
                </span>
              </div>

              {/* Main heading */}
              <h1 className="text-midnight_text dark:text-white font-bold leading-[0.92] tracking-tight">
                <span className="block text-5xl sm:text-6xl lg:text-7xl">
                  Centro de
                </span>
                <span className="block text-5xl sm:text-6xl lg:text-7xl text-primary">
                  Innovación
                </span>
                <span className="block text-4xl sm:text-5xl lg:text-6xl mt-1">
                  y Emprendimiento
                </span>
              </h1>

              {/* Description */}
              <p className="text-dark_grey dark:text-gray-300 text-lg leading-relaxed max-w-[50ch]">
                Fomentamos el emprendimiento productivo ofreciendo coworking,
                incubación de proyectos, tecnología y capacitación para
                aprendices, egresados y grupos vulnerables.
              </p>

              {/* CTA buttons */}
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href="/capacitaciones"
                  className="inline-flex items-center gap-2.5 bg-primary hover:bg-primary/90 text-white font-semibold px-7 py-3.5 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg hover:-translate-y-0.5"
                >
                  <Icon icon="solar:diploma-bold" className="text-xl" />
                  Ver Capacitaciones
                </Link>
                <Link
                  href="/eventos"
                  className="inline-flex items-center gap-2.5 bg-white dark:bg-gray-800 text-midnight_text dark:text-white font-semibold px-7 py-3.5 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-primary hover:text-primary dark:hover:text-primary transition-all duration-200"
                >
                  <Icon icon="solar:calendar-bold" className="text-xl" />
                  Próximos Eventos
                </Link>
              </div>

              {/* Trust signals */}
              <div className="flex items-center gap-5 pt-2">
                <div className="flex items-center gap-2">
                  <Icon
                    icon="solar:verified-check-bold"
                    className="text-success text-xl flex-shrink-0"
                  />
                  <span className="text-sm text-dark_grey dark:text-gray-400 font-medium">
                    Institución Pública
                  </span>
                </div>
                <div className="w-px h-4 bg-gray-200 dark:bg-gray-700" />
                <div className="flex items-center gap-2">
                  <Icon
                    icon="solar:medal-ribbons-star-bold"
                    className="text-success text-xl flex-shrink-0"
                  />
                  <span className="text-sm text-dark_grey dark:text-gray-400 font-medium">
                    Certificación INADEH
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Interactive service cards */}
            <div className="col-span-6 relative animate-fade-up delay-200">
              {/* Ambient glow behind cards */}
              <div className="absolute inset-4 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-3xl blur-3xl" />

              <div className="relative grid grid-cols-2 gap-4">
                {/* Card 1 - Capacitaciones */}
                <Link
                  href="/capacitaciones"
                  className="group bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6 flex flex-col gap-3 hover:-translate-y-1.5 hover:shadow-xl hover:border-primary/25 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 group-hover:bg-primary/15 flex items-center justify-center transition-colors">
                    <Icon
                      icon="solar:diploma-bold"
                      className="text-primary text-2xl"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-midnight_text dark:text-white text-sm">
                      Capacitaciones
                    </p>
                    <p className="text-xs text-dark_grey dark:text-gray-400 mt-0.5 leading-relaxed">
                      Cursos y talleres técnicos certificados
                    </p>
                  </div>
                  <Icon
                    icon="solar:arrow-right-up-linear"
                    className="text-primary text-sm self-end opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200"
                  />
                </Link>

                {/* Card 2 - Eventos */}
                <Link
                  href="/eventos"
                  className="group bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6 flex flex-col gap-3 hover:-translate-y-1.5 hover:shadow-xl hover:border-secondary/30 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 group-hover:bg-secondary/15 flex items-center justify-center transition-colors">
                    <Icon
                      icon="solar:calendar-bold"
                      className="text-secondary text-2xl"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-midnight_text dark:text-white text-sm">
                      Eventos
                    </p>
                    <p className="text-xs text-dark_grey dark:text-gray-400 mt-0.5 leading-relaxed">
                      Networking y conferencias
                    </p>
                  </div>
                  <Icon
                    icon="solar:arrow-right-up-linear"
                    className="text-secondary text-sm self-end opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200"
                  />
                </Link>

                {/* Card 3 - Blog */}
                <Link
                  href="/blog"
                  className="group bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-6 flex flex-col gap-3 hover:-translate-y-1.5 hover:shadow-xl hover:border-success/30 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-success/10 group-hover:bg-success/15 flex items-center justify-center transition-colors">
                    <Icon
                      icon="solar:document-text-bold"
                      className="text-success text-2xl"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-midnight_text dark:text-white text-sm">
                      Blog CIEPI
                    </p>
                    <p className="text-xs text-dark_grey dark:text-gray-400 mt-0.5 leading-relaxed">
                      Investigaciones y artículos
                    </p>
                  </div>
                  <Icon
                    icon="solar:arrow-right-up-linear"
                    className="text-success text-sm self-end opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200"
                  />
                </Link>

                {/* Card 4 - Contacto (primary tinted bg) */}
                <Link
                  href="/contacto"
                  className="group bg-primary/5 dark:bg-primary/12 rounded-2xl border border-primary/15 dark:border-primary/25 p-6 flex flex-col gap-3 hover:-translate-y-1.5 hover:shadow-xl hover:bg-primary/8 transition-all duration-200"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
                    <Icon
                      icon="solar:chat-line-bold"
                      className="text-primary text-2xl"
                    />
                  </div>
                  <div>
                    <p className="font-bold text-midnight_text dark:text-white text-sm">
                      Contacto
                    </p>
                    <p className="text-xs text-dark_grey dark:text-gray-400 mt-0.5 leading-relaxed">
                      Envíanos tu consulta
                    </p>
                  </div>
                  <Icon
                    icon="solar:arrow-right-up-linear"
                    className="text-primary text-sm self-end opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all duration-200"
                  />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          STATS STRIP
      ============================================================ */}
      <div className="bg-primary">
        <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-2 text-center">
            {[
              {
                number: "50+",
                label: "Capacitaciones",
                icon: "solar:diploma-bold",
              },
              {
                number: "100+",
                label: "Eventos Realizados",
                icon: "solar:calendar-bold",
              },
              {
                number: "1,000+",
                label: "Personas Capacitadas",
                icon: "solar:users-group-rounded-bold",
              },
              {
                number: "24/7",
                label: "Acceso Digital",
                icon: "solar:monitor-smartphone-bold",
              },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-2 py-2">
                <Icon icon={stat.icon} className="text-white/30 text-3xl" />
                <span className="text-white text-4xl lg:text-5xl font-bold tracking-tight leading-none">
                  {stat.number}
                </span>
                <span className="text-white/65 text-sm font-medium">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ============================================================
          SERVICES SECTION
      ============================================================ */}
      <section className="bg-slateGray dark:bg-gray-900">
        <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4">
          {/* Section header */}
          <div className="text-center mb-14 animate-fade-up">
            <span className="inline-block text-secondary text-xs font-bold uppercase tracking-[0.18em] mb-4">
              Nuestros Servicios
            </span>
            <h2 className="text-4xl lg:text-5xl font-bold text-midnight_text dark:text-white mb-4 leading-tight">
              Todo lo que necesitas
              <br className="hidden sm:block" /> para emprender
            </h2>
            <div className="w-14 h-1 bg-secondary rounded-full mx-auto" />
          </div>

          {/* Service cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: "solar:home-wifi-bold",
                title: "Espacios de Coworking",
                desc: "Accede a espacios de trabajo colaborativo equipados con tecnología de punta para aprendices y emprendedores.",
                bg: "bg-primary/5 dark:bg-primary/10",
                border: "border-primary/12 dark:border-primary/20",
                iconBg: "bg-primary/10",
                iconColor: "text-primary",
                hoverBorder: "hover:border-primary/30",
              },
              {
                icon: "solar:rocket-bold",
                title: "Incubación de Proyectos",
                desc: "Acompañamos tu idea desde el concepto hasta la ejecución con mentoría especializada y acceso a redes de financiamiento.",
                bg: "bg-secondary/5 dark:bg-secondary/10",
                border: "border-secondary/12 dark:border-secondary/20",
                iconBg: "bg-secondary/10",
                iconColor: "text-secondary",
                hoverBorder: "hover:border-secondary/30",
              },
              {
                icon: "solar:diploma-bold",
                title: "Capacitación Técnica",
                desc: "Cursos certificados en tecnología, negocios y emprendimiento para aprendices, egresados y grupos vulnerables.",
                bg: "bg-success/5 dark:bg-success/10",
                border: "border-success/12 dark:border-success/20",
                iconBg: "bg-success/10",
                iconColor: "text-success",
                hoverBorder: "hover:border-success/30",
              },
            ].map((s, i) => (
              <div
                key={i}
                className={`${s.bg} rounded-2xl border ${s.border} ${s.hoverBorder} p-8 hover:-translate-y-1 transition-all duration-200 animate-fade-up`}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div
                  className={`w-14 h-14 rounded-2xl ${s.iconBg} flex items-center justify-center mb-6`}
                >
                  <Icon icon={s.icon} className={`${s.iconColor} text-3xl`} />
                </div>
                <h3 className="text-xl font-bold text-midnight_text dark:text-white mb-3">
                  {s.title}
                </h3>
                <p className="text-dark_grey dark:text-gray-400 text-sm leading-relaxed">
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          CTA STRIP
      ============================================================ */}
      <section
        className="relative overflow-hidden py-0"
        style={{
          background:
            "linear-gradient(135deg, #ed7625 0%, #f5943a 50%, #e86018 100%)",
        }}
      >
        {/* Subtle pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #ffffff 1.5px, transparent 1.5px)",
            backgroundSize: "24px 24px",
          }}
        />
        <div className="relative z-10 container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 py-16 text-center">
          <span className="inline-block text-white/70 text-xs font-bold uppercase tracking-[0.18em] mb-4">
            Únete a CIEPI
          </span>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4 leading-tight">
            ¿Listo para transformar tu idea
            <br className="hidden sm:block" /> en un proyecto real?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Miles de personas ya están construyendo su futuro con el apoyo de
            CIEPI — INADEH.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/contacto"
              className="inline-flex items-center gap-2.5 bg-white text-secondary font-bold px-8 py-3.5 rounded-xl hover:bg-white/92 transition-all duration-200 shadow-lg hover:-translate-y-0.5"
            >
              <Icon icon="solar:chat-line-bold" className="text-xl" />
              Contáctanos hoy
            </Link>
            <Link
              href="/capacitaciones"
              className="inline-flex items-center gap-2.5 bg-white/15 text-white font-semibold px-8 py-3.5 rounded-xl border border-white/30 hover:bg-white/25 transition-all duration-200"
            >
              <Icon icon="solar:diploma-bold" className="text-xl" />
              Ver Capacitaciones
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
