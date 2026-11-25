/**
 * Sistema de permisos basado en roles
 */

export enum Role {
  ADMIN = 1,
  SUPER_ADMIN = 2,
  CIEPI = 3,
  RELACIONES_PUBLICAS = 4,
}

export enum BlogState {
  BORRADOR = 1,
  EN_REVISION_CIEPI = 2,
  RECHAZADO_CIEPI = 3,
  EN_REVISION_RP = 4,
  RECHAZADO_RP = 5,
  PUBLICADO = 6,
}

/**
 * Verifica si un rol puede crear blogs
 */
export function canCreateBlog(role: number): boolean {
  return (
    role === Role.CIEPI || role === Role.ADMIN || role === Role.SUPER_ADMIN
  );
}

/**
 * Verifica si un rol puede editar blogs (en general). La regla completa —autor o
 * administrador, y solo en Borrador/Rechazado— está en lib/estados/blog.ts.
 */
export function canEditBlog(role: number): boolean {
  return (
    role === Role.CIEPI || role === Role.ADMIN || role === Role.SUPER_ADMIN
  );
}

/**
 * Verifica si un rol puede eliminar blogs
 */
export function canDeleteBlog(role: number): boolean {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}

// Las transiciones de estado del blog (quién puede mover qué y desde dónde) y la regla de
// edición de contenido por estado viven en lib/estados/blog.ts (TRANSICIONES_BLOG,
// transicionesBlog, validarTransicionBlog, motivoNoEditable). Aquí quedan solo los
// permisos por rol que no dependen del estado.
