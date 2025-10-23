"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import {
  navigationConfig,
  type NavLink,
  type NavSection,
} from "@/config/navigation";

export default function Navbar() {
  const { data: session, status } = useSession();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [sticky, setSticky] = useState(false);

  const isAdmin = session?.user?.isAdmin ?? false;
  const isAuthenticated = !!session;
  const userName = session?.user?.name ?? session?.user?.email ?? "Usuario";

  // Función para filtrar links visibles según el contexto
  const filterLinks = (
    links: NavLink[],
    context: "desktop" | "mobile"
  ): NavLink[] => {
    return links.filter((link) => {
      const { visible } = link;

      // Verificar visibilidad por dispositivo
      if (context === "desktop" && !visible.desktop) return false;
      if (context === "mobile" && !visible.mobile) return false;

      // Verificar permisos de usuario
      if (visible.admin && !isAdmin) return false;
      if (
        visible.authenticated &&
        !visible.public &&
        !visible.admin &&
        !isAuthenticated
      )
        return false;

      // Si tiene restricciones y no cumple ninguna, ocultar
      if (!visible.public && !visible.authenticated && !visible.admin)
        return false;

      return true;
    });
  };

  // Obtener secciones visibles
  const getVisibleSections = (context: "desktop" | "mobile"): NavSection[] => {
    return navigationConfig
      .map((section) => ({
        ...section,
        links: filterLinks(section.links, context),
      }))
      .filter((section) => {
        // Excluir secciones que requieren admin si no es admin
        if (section.requiresAdmin && !isAdmin) return false;
        // Excluir secciones sin links visibles
        return section.links.length > 0;
      });
  };

  const handleScroll = () => {
    setSticky(window.scrollY >= 80);
  };

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);

    // Cerrar menús al hacer clic fuera
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest("[data-menu]")) {
        setShowUserMenu(false);
        setShowAdminMenu(false);
        setShowMobileMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("click", handleClickOutside);
    };
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 bg-white dark:bg-gray-800 ${
        sticky ? "shadow-lg py-4" : "shadow-none py-6"
      }`}
    >
      <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-blue-700 rounded-full flex items-center justify-center shadow-lg">
              <span className="font-bold text-white text-xl">C</span>
            </div>
            <span className="font-bold text-2xl tracking-tight text-midnight_text dark:text-white hidden sm:block">
              CIEPI
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-2">
            {getVisibleSections("desktop").map((section, sectionIdx) => {
              // Si la sección requiere admin, mostrarla como dropdown
              if (section.requiresAdmin) {
                return (
                  <div key={sectionIdx} className="relative" data-menu>
                    <button
                      onClick={() => setShowAdminMenu(!showAdminMenu)}
                      className="px-6 py-3 text-midnight_text dark:text-gray-300 hover:bg-slateGray dark:hover:bg-gray-800 rounded-full transition-all duration-300 font-medium flex items-center gap-2"
                    >
                      <Icon icon="solar:settings-linear" className="w-5 h-5" />
                      <span>Admin</span>
                      <Icon
                        icon="solar:alt-arrow-down-linear"
                        className="w-4 h-4"
                      />
                    </button>
                    {showAdminMenu && (
                      <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-xl py-3 z-50 border border-gray-100 dark:border-gray-700">
                        {section.links.map((link, linkIdx) => (
                          <Link
                            key={linkIdx}
                            href={link.href}
                            className="flex items-center px-5 py-3 text-sm text-midnight_text dark:text-gray-200 hover:bg-slateGray dark:hover:bg-gray-700 transition-colors group"
                            onClick={() => setShowAdminMenu(false)}
                          >
                            <Icon
                              icon={link.icon}
                              className="w-5 h-5 mr-3 text-primary group-hover:scale-110 transition-transform"
                            />
                            {link.name}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }

              // Links normales (sin dropdown)
              return section.links.map((link, linkIdx) => (
                <Link
                  key={`${sectionIdx}-${linkIdx}`}
                  href={link.href}
                  className="px-6 py-3 text-midnight_text dark:text-gray-300 hover:bg-slateGray dark:hover:bg-gray-800 rounded-full transition-all duration-300 font-medium"
                >
                  <Icon
                    icon={link.icon}
                    className="w-5 h-5 inline-block mr-2"
                  />
                  {link.name}
                </Link>
              ));
            })}
          </nav>

          {/* User Menu / Auth Buttons */}
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 text-midnight_text dark:text-white hover:bg-slateGray dark:hover:bg-gray-800 rounded-lg transition-colors"
              data-menu
            >
              <Icon
                icon={
                  showMobileMenu
                    ? "solar:close-square-linear"
                    : "solar:hamburger-menu-linear"
                }
                className="w-6 h-6"
              />
            </button>

            {status === "loading" ? (
              <div className="text-dark_grey text-sm">Cargando...</div>
            ) : session ? (
              <div className="relative" data-menu>
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white font-semibold shadow-lg relative group-hover:scale-105 transition-transform">
                    {userName.charAt(0).toUpperCase()}
                    {isAdmin && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-success border-2 border-white dark:border-gray-900 rounded-full flex items-center justify-center">
                        <Icon
                          icon="solar:verified-check-bold"
                          className="text-white text-[10px]"
                        />
                      </span>
                    )}
                  </div>
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-xl py-3 z-50 border border-gray-100 dark:border-gray-700">
                    <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-3">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white font-semibold text-xl shadow-lg">
                          {userName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-midnight_text dark:text-white truncate text-base">
                            {userName}
                          </div>
                          <div className="text-xs text-dark_grey dark:text-gray-400 truncate">
                            {session.user?.email}
                          </div>
                          {isAdmin && (
                            <div className="text-xs text-success mt-1 flex items-center gap-1">
                              <Icon
                                icon="solar:verified-check-bold"
                                className="w-3 h-3"
                              />
                              Administrador
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        signOut({ callbackUrl: "/ciepi/admin/login" });
                      }}
                      className="flex items-center w-full text-left px-5 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 transition-colors mt-1 group"
                    >
                      <Icon
                        icon="solar:logout-2-linear"
                        className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform"
                      />
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              ""
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div
            className="lg:hidden mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
            data-menu
          >
            <nav className="flex flex-col gap-2">
              {getVisibleSections("mobile").map((section, sectionIdx) => (
                <div key={sectionIdx}>
                  {/* Título de sección (solo si existe) */}
                  {section.title && (
                    <div className="px-4 py-2 mt-2">
                      <div className="text-xs font-semibold text-dark_grey dark:text-gray-400 uppercase tracking-wider">
                        {section.title}
                      </div>
                    </div>
                  )}

                  {/* Links de la sección */}
                  {section.links.map((link, linkIdx) => (
                    <Link
                      key={linkIdx}
                      href={link.href}
                      className="flex items-center px-4 py-3 text-midnight_text dark:text-gray-300 hover:bg-slateGray dark:hover:bg-gray-800 rounded-lg transition-all duration-300 font-medium"
                      onClick={() => setShowMobileMenu(false)}
                    >
                      <Icon
                        icon={link.icon}
                        className={`w-5 h-5 mr-3 ${
                          section.requiresAdmin ? "text-primary" : ""
                        }`}
                      />
                      {link.name}
                    </Link>
                  ))}
                </div>
              ))}

              {/* User Info Mobile */}
              {session && (
                <>
                  <div className="px-4 py-2 mt-2">
                    <div className="text-xs font-semibold text-dark_grey dark:text-gray-400 uppercase tracking-wider">
                      Usuario
                    </div>
                  </div>
                  <div className="flex items-center px-4 py-3 bg-slateGray dark:bg-gray-800 rounded-lg">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center text-white font-semibold mr-3">
                      {userName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-midnight_text dark:text-white truncate">
                        {userName}
                      </div>
                      <div className="text-xs text-dark_grey dark:text-gray-400 truncate">
                        {session.user?.email}
                      </div>
                      {isAdmin && (
                        <div className="text-xs text-success flex items-center gap-1">
                          <Icon
                            icon="solar:verified-check-bold"
                            className="w-3 h-3"
                          />
                          Administrador
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowMobileMenu(false);
                      signOut({ callbackUrl: "/ciepi/admin/login" });
                    }}
                    className="flex items-center px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium mt-2"
                  >
                    <Icon
                      icon="solar:logout-2-linear"
                      className="w-5 h-5 mr-3"
                    />
                    Cerrar Sesión
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
