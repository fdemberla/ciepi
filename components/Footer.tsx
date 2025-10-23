"use client";
import Link from "next/link";
import { Icon } from "@iconify/react";

const Footer = () => {
  return (
    <footer className="bg-slateGray dark:bg-gray-800 py-16 mt-auto border-t border-gray-200 dark:border-gray-700">
      <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4">
        <div className="grid grid-cols-1 gap-y-12 gap-x-8 sm:grid-cols-2 lg:grid-cols-12">
          {/* Logo y Redes Sociales */}
          <div className="col-span-1 sm:col-span-2 lg:col-span-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-700 rounded-full flex items-center justify-center shadow-lg">
                <span className="font-bold text-white text-xl">C</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-dark_grey dark:text-white">
                  CIEPI
                </h3>
                <p className="text-dark_grey dark:text-gray-400 text-sm">
                  Centro de Innovación y Emprendimiento
                </p>
              </div>
            </div>
            <p className="text-dark_grey dark:text-gray-400 mb-6 text-sm leading-relaxed">
              Impulsando el desarrollo profesional a través de capacitaciones de
              calidad.
            </p>
            <div className="flex items-center gap-3">
              <Link
                href="#"
                className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 hover:bg-primary text-midnight_text dark:text-gray-200 hover:text-white flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <Icon icon="tabler:brand-facebook" className="text-2xl" />
              </Link>
              <Link
                href="#"
                className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 hover:bg-primary text-midnight_text dark:text-gray-200 hover:text-white flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <Icon icon="tabler:brand-twitter" className="text-2xl" />
              </Link>
              <Link
                href="#"
                className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 hover:bg-primary text-midnight_text dark:text-gray-200 hover:text-white flex items-center justify-center transition-all duration-300 shadow-md hover:shadow-lg"
              >
                <Icon icon="tabler:brand-instagram" className="text-2xl" />
              </Link>
            </div>
          </div>

          {/* Enlaces Rápidos */}
          <div className="col-span-1 lg:col-span-2">
            <h3 className="mb-6 text-xl font-bold text-midnight_text dark:text-white">
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
            </ul>
          </div>

          {/* Administración */}
          <div className="col-span-1 lg:col-span-2">
            <h3 className="mb-6 text-xl font-bold text-midnight_text dark:text-white">
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
          <div className="col-span-1 sm:col-span-2 lg:col-span-4">
            <h3 className="mb-6 text-xl font-bold text-midnight_text dark:text-white">
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
    </footer>
  );
};

export default Footer;
