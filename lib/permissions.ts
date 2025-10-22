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
 * Verifica si un rol puede editar blogs
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

/**
 * Obtiene los estados permitidos a los que puede cambiar un blog según el rol
 */
export function getAllowedStatesForRole(role: number): number[] {
  // Admins pueden cambiar a cualquier estado
  if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
    return [
      BlogState.BORRADOR,
      BlogState.EN_REVISION_CIEPI,
      BlogState.RECHAZADO_CIEPI,
      BlogState.EN_REVISION_RP,
      BlogState.RECHAZADO_RP,
      BlogState.PUBLICADO,
    ];
  }

  // CIEPI (rol 3): puede crear (estado 1), enviar a revisión CIEPI (estado 2), rechazar CIEPI (estado 3), y enviar a RP (estado 4)
  if (role === Role.CIEPI) {
    // Solo puede cambiar si es su blog (verificado en otra parte)
    // Estados permitidos: 1, 2, 3, 4
    return [
      BlogState.BORRADOR,
      BlogState.EN_REVISION_CIEPI,
      BlogState.RECHAZADO_CIEPI,
      BlogState.EN_REVISION_RP,
    ];
  }

  // Relaciones Públicas (rol 4): puede mover a cualquier estado EXCEPTO editar
  if (role === Role.RELACIONES_PUBLICAS) {
    // Puede cambiar a cualquier estado
    return [
      BlogState.BORRADOR,
      BlogState.EN_REVISION_CIEPI,
      BlogState.RECHAZADO_CIEPI,
      BlogState.EN_REVISION_RP,
      BlogState.RECHAZADO_RP,
      BlogState.PUBLICADO,
    ];
  }

  return [];
}

/**
 * Verifica si un rol puede cambiar a un estado específico
 */
export function canChangeToState(role: number, targetState: number): boolean {
  const allowedStates = getAllowedStatesForRole(role);
  return allowedStates.includes(targetState);
}

/**
 * Obtiene los permisos del rol del usuario
 */
export interface UserPermissions {
  canCreateBlog: boolean;
  canEditBlog: boolean;
  canDeleteBlog: boolean;
  canChangeState: boolean;
  allowedStates: number[];
}

export function getUserPermissions(role: number): UserPermissions {
  return {
    canCreateBlog: canCreateBlog(role),
    canEditBlog: canEditBlog(role),
    canDeleteBlog: canDeleteBlog(role),
    canChangeState: getAllowedStatesForRole(role).length > 0,
    allowedStates: getAllowedStatesForRole(role),
  };
}
