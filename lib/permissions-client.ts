/**
 * Helper para permisos en el cliente
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

export function canCreateBlog(role: number): boolean {
  return (
    role === Role.CIEPI || role === Role.ADMIN || role === Role.SUPER_ADMIN
  );
}

export function canEditBlog(role: number): boolean {
  return (
    role === Role.CIEPI || role === Role.ADMIN || role === Role.SUPER_ADMIN
  );
}

export function canDeleteBlog(role: number): boolean {
  return role === Role.ADMIN || role === Role.SUPER_ADMIN;
}

export function getAllowedStatesForRole(role: number): number[] {
  if (role === Role.ADMIN || role === Role.SUPER_ADMIN) {
    return [1, 2, 3, 4, 5, 6];
  }

  if (role === Role.CIEPI) {
    return [1, 2, 3, 4];
  }

  if (role === Role.RELACIONES_PUBLICAS) {
    return [1, 2, 3, 4, 5, 6];
  }

  return [];
}

export function canChangeToState(role: number, targetState: number): boolean {
  const allowedStates = getAllowedStatesForRole(role);
  return allowedStates.includes(targetState);
}

export function getStateLabel(state: number): string {
  const labels: { [key: number]: string } = {
    1: "Borrador",
    2: "En Revisión CIEPI",
    3: "Rechazado por CIEPI",
    4: "En Revisión Relaciones Públicas",
    5: "Rechazado por Relaciones Públicas",
    6: "Publicado",
  };
  return labels[state] || "Desconocido";
}
