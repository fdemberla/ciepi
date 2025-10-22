// Tipos para la configuración de navegación
export interface NavLink {
  name: string;
  href: string;
  icon: string;
  visible: {
    public?: boolean; // Visible para usuarios no autenticados
    authenticated?: boolean; // Visible para usuarios autenticados
    admin?: boolean; // Visible solo para administradores
    mobile?: boolean; // Visible en menú móvil
    desktop?: boolean; // Visible en menú desktop
  };
}

export interface NavSection {
  title?: string; // Título de la sección (solo para móvil)
  links: NavLink[];
  requiresAdmin?: boolean; // Si toda la sección requiere admin
}

/**
 * Configuración de navegación del sitio
 *
 * Para agregar una nueva página:
 * 1. Agrega un nuevo objeto NavLink en la sección correspondiente
 * 2. Define el nombre, href (ruta), e icono (de iconify)
 * 3. Configura la visibilidad según los permisos y dispositivos
 *
 * Ejemplos de iconos: https://icon-sets.iconify.design/solar/
 */
export const navigationConfig: NavSection[] = [
  {
    // Enlaces públicos principales
    links: [
      {
        name: "Inicio",
        href: "/",
        icon: "solar:home-2-linear",
        visible: {
          public: true,
          authenticated: true,
          admin: true,
          mobile: true,
          desktop: true,
        },
      },
      {
        name: "Capacitaciones",
        href: "/capacitaciones",
        icon: "solar:diploma-verified-linear",
        visible: {
          public: true,
          authenticated: true,
          admin: true,
          mobile: true,
          desktop: true,
        },
      },
      {
        name: "Eventos",
        href: "/eventos",
        icon: "solar:calendar-minimalistic-linear",
        visible: {
          public: true,
          authenticated: true,
          admin: true,
          mobile: true,
          desktop: true,
        },
      },
      {
        name: "Blog",
        href: "/blog",
        icon: "solar:document-text-linear",
        visible: {
          public: true,
          authenticated: true,
          admin: true,
          mobile: true,
          desktop: true,
        },
      },
      {
        name: "Contacto",
        href: "/contacto",
        icon: "solar:letter-linear",
        visible: {
          public: true,
          authenticated: true,
          admin: true,
          mobile: true,
          desktop: true,
        },
      },
    ],
  },
  {
    // Enlaces de administración
    title: "Administración",
    requiresAdmin: true,
    links: [
      {
        name: "Capacitaciones",
        href: "/admin/capacitaciones",
        icon: "solar:diploma-verified-linear",
        visible: {
          admin: true,
          mobile: true,
          desktop: true,
        },
      },
      {
        name: "Consultas",
        href: "/admin/consultas",
        icon: "solar:chat-round-dots-linear",
        visible: {
          admin: true,
          mobile: true,
          desktop: true,
        },
      },
      {
        name: "Mensajes de Contacto",
        href: "/admin/contacto",
        icon: "solar:letter-linear",
        visible: {
          admin: true,
          mobile: true,
          desktop: true,
        },
      },
      {
        name: "Gestión de Blog",
        href: "/admin/blog",
        icon: "solar:document-text-linear",
        visible: {
          admin: true,
          mobile: true,
          desktop: true,
        },
      },
      {
        name: "Usuarios",
        href: "/admin/usuarios",
        icon: "solar:users-group-rounded-linear",
        visible: {
          admin: true,
          mobile: true,
          desktop: true,
        },
      },
      {
        name: "Roles",
        href: "/admin/roles",
        icon: "solar:users-group-rounded-linear",
        visible: {
          admin: true,
          mobile: true,
          desktop: true,
        },
      },
    ],
  },
];
