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

  // Relaciones Públicas (rol 4): solo puede aprobar o rechazar en su etapa del flujo.
  // No puede revertir un blog a Borrador ni a estados de revisión CIEPI.
  if (role === Role.RELACIONES_PUBLICAS) {
    return [
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

const ALL_BLOG_STATES: readonly BlogState[] = [
  BlogState.BORRADOR,
  BlogState.EN_REVISION_CIEPI,
  BlogState.RECHAZADO_CIEPI,
  BlogState.EN_REVISION_RP,
  BlogState.RECHAZADO_RP,
  BlogState.PUBLICADO,
];

export function isValidBlogState(value: number): value is BlogState {
  return ALL_BLOG_STATES.includes(value as BlogState);
}

/**
 * Mapa estricto de transiciones válidas para BlogState (con chequeo exhaustivo).
 * 1→2; 2→3|4; 3→1; 4→5|6; 5→1; 6 sin salida.
 */
export function getNextBlogStates(currentState: BlogState): BlogState[] {
  switch (currentState) {
    case BlogState.BORRADOR:
      return [BlogState.EN_REVISION_CIEPI];
    case BlogState.EN_REVISION_CIEPI:
      return [BlogState.RECHAZADO_CIEPI, BlogState.EN_REVISION_RP];
    case BlogState.RECHAZADO_CIEPI:
      return [BlogState.BORRADOR];
    case BlogState.EN_REVISION_RP:
      return [BlogState.RECHAZADO_RP, BlogState.PUBLICADO];
    case BlogState.RECHAZADO_RP:
      return [BlogState.BORRADOR];
    case BlogState.PUBLICADO:
      return [];
    default: {
      const _exhaustive: never = currentState;
      return _exhaustive;
    }
  }
}

export interface BlogTransitionResult {
  allowed: boolean;
  isOverride?: boolean;
  status?: number;
  reason?: string;
}

/**
 * Valida una transición de estado de blog considerando rol y grafo estricto.
 * Admin (1) y Super Admin (2) mantienen override entre estados válidos 1-6.
 */
export function validateBlogStateTransition(
  currentState: number,
  targetState: number,
  role: number,
): BlogTransitionResult {
  if (!isValidBlogState(currentState) || !isValidBlogState(targetState)) {
    return {
      allowed: false,
      status: 400,
      reason: "Estado de blog inválido.",
    };
  }

  if (currentState === targetState) {
    return {
      allowed: false,
      status: 400,
      reason: "El estado destino debe ser distinto del estado actual.",
    };
  }

  if (!canChangeToState(role, targetState)) {
    return {
      allowed: false,
      status: 403,
      reason: "No tiene permisos para cambiar el blog a ese estado.",
    };
  }

  const isStrictNext = getNextBlogStates(currentState).includes(targetState);
  if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
    return { allowed: true, isOverride: !isStrictNext };
  }

  if (!isStrictNext) {
    return {
      allowed: false,
      status: 400,
      reason: `Transición no permitida de estado ${currentState} a ${targetState}.`,
    };
  }

  return { allowed: true, isOverride: false };
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
