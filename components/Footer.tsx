import Link from "next/link";
import { Icon } from "@iconify/react";
import NewsletterForm from "./NewsletterForm";
import BrandLogos from "@/components/brand/BrandLogos";

const Footer = () => {
  return (
    <footer className="bg-slateGray dark:bg-gray-800 pt-16 mt-auto border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4">
        {/* Ancla "#boletin" usada por los accesos rápidos de la portada */}
        <div id="boletin" className="scroll-mt-28">
          <NewsletterForm />
        </div>
        <div className="grid grid-cols-1 gap-y-12 gap-x-8 sm:grid-cols-2 lg:grid-cols-12">
          {/* Logo y Redes Sociales */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-4">
            <div className="mb-6">
              <BrandLogos height={30} />
            </div>
            <p className="text-dark_grey dark:text-gray-400 mb-6 text-sm leading-relaxed">
              Impulsando el desarrollo profesional a través de capacitaciones de
              calidad.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="#"
                aria-label="Facebook de CIEPI"
                className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 hover:bg-primary/10 dark:hover:bg-primary/20 text-dark_grey dark:text-gray-300 hover:text-primary flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Icon icon="tabler:brand-facebook" className="text-xl" />
              </Link>
              <Link
                href="#"
                aria-label="Twitter de CIEPI"
                className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 hover:bg-primary/10 dark:hover:bg-primary/20 text-dark_grey dark:text-gray-300 hover:text-primary flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Icon icon="tabler:brand-twitter" className="text-xl" />
              </Link>
              <Link
                href="#"
                aria-label="Instagram de CIEPI"
                className="w-10 h-10 rounded-full bg-white dark:bg-gray-700 hover:bg-primary/10 dark:hover:bg-primary/20 text-dark_grey dark:text-gray-300 hover:text-primary flex items-center justify-center transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <Icon icon="tabler:brand-instagram" className="text-xl" />
              </Link>
            </div>
          </div>

          {/* Enlaces Rápidos */}
          <div className="col-span-1 lg:col-span-2">
            <h3 className="mb-6 text-xl font-bold text-primary dark:text-white">
              Enlaces Rápidos
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/"
                  className="text-dark_grey dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors text-sm font-medium flex items-center gap-2 group"
                >
                  <Icon
                    icon="solar:alt-arrow-right-linear"
                    className="text-primary group-hover:translate-x-1 transition-transform"
                  />
                  Inicio
                </Link>
              </li>
              <li>
                <Link
                  href="/capacitaciones"
                  className="text-dark_grey dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors text-sm font-medium flex items-center gap-2 group"
                >
                  <Icon
                    icon="solar:alt-arrow-right-linear"
                    className="text-primary group-hover:translate-x-1 transition-transform"
                  />
                  Capacitaciones
                </Link>
              </li>
              <li>
                <Link
                  href="/contacto"
                  className="text-dark_grey dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors text-sm font-medium flex items-center gap-2 group"
                >
                  <Icon
                    icon="solar:alt-arrow-right-linear"
                    className="text-primary group-hover:translate-x-1 transition-transform"
                  />
                  Contacto
                </Link>
              </li>
              <li>
                <Link
                  href="/privacidad"
                  className="text-dark_grey dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors text-sm font-medium flex items-center gap-2 group"
                >
                  <Icon
                    icon="solar:alt-arrow-right-linear"
                    className="text-primary group-hover:translate-x-1 transition-transform"
                  />
                  Política de Privacidad
                </Link>
              </li>
            </ul>
          </div>

          {/* Administración */}
          <div className="col-span-1 sm:col-span-1 lg:col-span-3">
            <h3 className="mb-6 text-xl font-bold text-primary dark:text-white">
              Administración
            </h3>
            <ul className="space-y-3">
              <li>
                <Link
                  href="/admin/login"
                  className="text-dark_grey dark:text-gray-400 hover:text-primary dark:hover:text-primary transition-colors text-sm font-medium flex items-center gap-2 group"
                >
                  <Icon
                    icon="solar:alt-arrow-right-linear"
                    className="text-primary group-hover:translate-x-1 transition-transform"
                  />
                  Portal Administrativo
                </Link>
              </li>
            </ul>
          </div>

          {/* Información de Contacto */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-3">
            <h3 className="mb-6 text-xl font-bold text-primary dark:text-white">
              Contacto
            </h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Icon
                    icon="solar:map-point-linear"
                    className="text-primary text-xl"
                  />
                </div>
                <div>
                  <p className="text-dark_grey dark:text-gray-400 text-sm leading-relaxed">
                    Panamá, República de Panamá
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Icon
                    icon="solar:phone-linear"
                    className="text-primary text-xl"
                  />
                </div>
                <div>
                  <p className="text-dark_grey dark:text-gray-400 text-sm">
                    +507 0000-0000
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Icon
                    icon="solar:letter-linear"
                    className="text-primary text-xl"
                  />
                </div>
                <div>
                  <p className="text-dark_grey dark:text-gray-400 text-sm">
                    info@ciepi.pa
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Franja de cierre: azul oficial, patrón del isotipo y lema */}
      <div className="relative bg-primary text-white mt-14 overflow-hidden">
        <div className="absolute inset-0 bg-inadeh-pattern opacity-[0.07] pointer-events-none" aria-hidden="true" />
        <span
          aria-hidden="true"
          className="absolute -left-12 -bottom-16 w-48 h-48 rounded-[3rem] rotate-[30deg] bg-brand-green/25"
        />
        <div className="relative container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <p className="font-[family-name:var(--font-display)] text-2xl sm:text-3xl font-semibold text-center md:text-left">
            En CIEPI, tu talento tiene un{" "}
            <span className="font-bold underline decoration-brand-green decoration-[5px] underline-offset-[6px]">
              propósito
            </span>
            .
          </p>
          <BrandLogos variant="dark" height={32} />
        </div>
        <div className="relative border-t border-white/15">
          <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/75">
            <p>
              &copy; {new Date().getFullYear()} CIEPI &mdash; Centro de Innovación y Emprendimiento Productivo
            </p>
            <div className="flex items-center gap-4">
              <Link href="/privacidad" className="hover:text-white hover:underline transition-colors">
                Política de Privacidad
              </Link>
              <span aria-hidden="true">&middot;</span>
              <span>INADEH &mdash; República de Panamá</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
