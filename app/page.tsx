import { Icon } from "@iconify/react";
import Link from "next/link";
import { withBasePath } from "@/lib/basePath";
import { getLatestPublishedBlogs, type PublishedBlogSummary } from "@/lib/blogPublic";
import BoomerangFrame from "@/components/brand/BoomerangFrame";
import ButtonLink from "@/components/brand/ButtonLink";
import SectionTitle from "@/components/brand/SectionTitle";
import QuickAccess from "@/components/brand/QuickAccess";
import NewsCard from "@/components/brand/NewsCard";

// La portada muestra las últimas noticias desde la BD: se genera en cada visita
// (evita además depender de la BD durante `next build`).
export const dynamic = "force-dynamic";

const CONTAINER = "container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4";

/** Palabra destacada del lema: blanca, con subrayado verde oficial (contraste AA sobre el azul). */
function Highlight({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-bold underline decoration-brand-green decoration-[5px] underline-offset-[6px]">
      {children}
    </span>
  );
}

const AREAS = [
  {
    key: "innovacion",
    title: "Innovación",
    text: "Explora, crea y transforma ideas en soluciones con capacitación técnica certificada y acceso a tecnología.",
    icon: "solar:lightbulb-bolt-linear",
    color: "primary" as const,
    cta: { href: "/capacitaciones", label: "Ver capacitaciones" },
  },
  {
    key: "emprendimiento",
    title: "Emprendimiento",
    text: "Desarrolla tu idea, fortalece tu negocio y hazlo crecer con coworking, incubación de proyectos y mentoría especializada.",
    icon: "solar:rocket-2-linear",
    color: "brand-green" as const,
    cta: { href: "/contacto", label: "Contáctanos" },
  },
];

export default async function Home() {
  let noticias: PublishedBlogSummary[] = [];
  try {
    noticias = await getLatestPublishedBlogs(4);
  } catch (error) {
    console.error("Error al cargar noticias de la portada:", error);
  }

  return (
    <div className="bg-white dark:bg-gray-900 overflow-hidden">
      {/* ============================================================
          HERO — azul oficial, foto en marco "boomerang" (manual p. 110-113)
      ============================================================ */}
      <section className="relative bg-primary text-white py-0">
        <div className="absolute inset-0 bg-inadeh-pattern opacity-[0.045] pointer-events-none" aria-hidden="true" />
        <div className={`relative ${CONTAINER} py-14 lg:py-20`}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            <div className="lg:col-span-6 flex flex-col gap-6 animate-fade-up">
              <span aria-hidden="true" className="block w-14 h-1.5 rounded-full bg-brand-green" />
              <h1 className="font-extrabold leading-none text-7xl sm:text-8xl tracking-wide">CIEPI</h1>
              <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl leading-snug font-semibold max-w-[24ch]">
                <Highlight>Ideas</Highlight> que se convierten en <Highlight>proyectos</Highlight>, proyectos que{" "}
                <Highlight>generan oportunidades</Highlight>.
              </p>
              <p className="text-white/85 text-lg leading-relaxed max-w-[52ch]">
                En el Centro de Innovación y Emprendimiento Productivo del INADEH impulsamos tu talento:
                coworking, incubación de proyectos, tecnología y capacitación para aprendices, egresados y
                grupos vulnerables.
              </p>
              <div className="flex flex-wrap gap-3 pt-1">
                <ButtonLink href="/capacitaciones" variant="orange">
                  Ver capacitaciones
                </ButtonLink>
                <ButtonLink href="/eventos" variant="outline-white">
                  Próximos eventos
                </ButtonLink>
              </div>
            </div>

            <div className="lg:col-span-6 animate-fade-up delay-200">
              {/* Foto provisional: reemplazar por fotografía de CIEPI según el estilo del manual (p. 108-109). */}
              <BoomerangFrame className="aspect-[4/3] shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={withBasePath("/brand/hero-placeholder.jpg")}
                  alt="Vista aérea de las instalaciones del INADEH"
                  className="w-full h-full object-cover"
                />
              </BoomerangFrame>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          ÁREAS — Innovación (azul) y Emprendimiento (verde)
      ============================================================ */}
      <section className="pt-12 pb-8 md:pt-16 md:pb-10">
        <div className={`${CONTAINER} grid grid-cols-1 md:grid-cols-2 gap-6`}>
          {AREAS.map((a) => {
            const blue = a.color === "primary";
            return (
              <article
                key={a.key}
                className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-800 border border-gray-200/80 dark:border-gray-700 shadow-sm p-8 pr-28 sm:pr-36 animate-fade-up"
              >
                {/* Forma angulada decorativa en el color del área */}
                <span
                  aria-hidden="true"
                  className={`absolute -right-10 -bottom-10 w-44 h-44 rounded-[2.5rem] rotate-[30deg] ${
                    blue ? "bg-primary" : "bg-brand-green"
                  } opacity-90`}
                />
                <span
                  aria-hidden="true"
                  className={`absolute right-16 -bottom-16 w-24 h-40 rounded-[2rem] rotate-[30deg] ${
                    blue ? "bg-brand-green" : "bg-primary"
                  } opacity-25`}
                />
                <div className="relative flex flex-col gap-4">
                  <span
                    className={`w-14 h-14 rounded-full flex items-center justify-center border-2 ${
                      blue ? "border-primary text-primary" : "border-brand-green text-brand-green"
                    } bg-white dark:bg-gray-900`}
                  >
                    <Icon icon={a.icon} className="text-3xl" aria-hidden="true" />
                  </span>
                  <h2 className="leading-none">
                    <span className="block text-lg font-semibold text-dark_grey dark:text-gray-300">Área de</span>
                    <span className={`block text-4xl font-extrabold ${blue ? "text-primary" : "text-brand-green"} dark:text-white`}>
                      {a.title}
                    </span>
                  </h2>
                  <p className="text-dark_grey dark:text-gray-300 leading-relaxed max-w-[42ch]">{a.text}</p>
                  <div>
                    <ButtonLink href={a.cta.href} variant="blue">
                      {a.cta.label}
                    </ButtonLink>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          ACCESOS RÁPIDOS
      ============================================================ */}
      <div className={`${CONTAINER} pb-4`}>
        <QuickAccess
          items={[
            { href: "/eventos", label: "Calendario de actividades", icon: "solar:calendar-linear", color: "primary" },
            { href: "/capacitaciones", label: "Capacitaciones", icon: "solar:diploma-linear", color: "secondary" },
            { href: "#boletin", label: "Boletín informativo", icon: "solar:letter-linear", color: "brand-green" },
            { href: "/contacto", label: "Contacto y consultas", icon: "solar:chat-round-line-linear", color: "primary" },
          ]}
        />
      </div>

      {/* ============================================================
          ACTUALIDAD CIEPI — últimas noticias del blog
      ============================================================ */}
      {noticias.length > 0 && (
        <section>
          <div className={CONTAINER}>
            <SectionTitle
              title="Actualidad CIEPI"
              link={{ href: "/blog", label: "Ver todas las noticias" }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {noticias.map((n) => (
                <NewsCard key={n.id} {...n} />
              ))}
            </div>
          </div>
        </section>
      )}

      {noticias.length === 0 && (
        <section className="py-8">
          <div className={`${CONTAINER} text-center`}>
            <Link href="/blog" className="text-primary font-semibold hover:underline">
              Visita el blog de CIEPI
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
