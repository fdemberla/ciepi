import { Role } from "@/lib/permissions";

export enum InscripcionState {
  NUEVA = 1,
  RECHAZADO = 2,
  MATRICULADO = 3,
  RETIRADO = 4,
  TERMINO_CURSO = 5,
  PENDIENTE_VALIDACION = 6,
}

const ALL_INSCRIPCION_STATES: readonly InscripcionState[] = [
  InscripcionState.NUEVA,
  InscripcionState.RECHAZADO,
  InscripcionState.MATRICULADO,
  InscripcionState.RETIRADO,
  InscripcionState.TERMINO_CURSO,
  InscripcionState.PENDIENTE_VALIDACION,
];

export function isValidInscripcionState(value: number): value is InscripcionState {
  return ALL_INSCRIPCION_STATES.includes(value as InscripcionState);
}

/**
 * Transiciones normales permitidas:
 * 1 → 6, 3, 2
 * 6 → 3, 2, 1
 * 3 → 5, 4
 * 5, 2, 4 → [] (finales; Admin/Super Admin pueden reabrir 2→6 y 4→3 como override)
 */
export function getNextInscripcionStates(
  currentState: InscripcionState,
): InscripcionState[] {
  switch (currentState) {
    case InscripcionState.NUEVA:
      return [
        InscripcionState.PENDIENTE_VALIDACION,
        InscripcionState.MATRICULADO,
        InscripcionState.RECHAZADO,
      ];
    case InscripcionState.PENDIENTE_VALIDACION:
      return [
        InscripcionState.MATRICULADO,
        InscripcionState.RECHAZADO,
        InscripcionState.NUEVA,
      ];
    case InscripcionState.MATRICULADO:
      return [InscripcionState.TERMINO_CURSO, InscripcionState.RETIRADO];
    case InscripcionState.RECHAZADO:
    case InscripcionState.RETIRADO:
    case InscripcionState.TERMINO_CURSO:
      return [];
    default: {
      const _exhaustive: never = currentState;
      return _exhaustive;
    }
  }
}

export interface InscripcionTransitionResult {
  allowed: boolean;
  isOverride?: boolean;
  status?: number;
  reason?: string;
}

export function validateInscripcionTransition(
  currentState: number,
  targetState: number,
  role: number,
): InscripcionTransitionResult {
  if (
    !isValidInscripcionState(currentState) ||
    !isValidInscripcionState(targetState)
  ) {
    return {
      allowed: false,
      status: 400,
      reason: "Estado de inscripción inválido.",
    };
  }

  if (currentState === targetState) {
    return {
      allowed: false,
      status: 400,
      reason: "La inscripción ya se encuentra en ese estado.",
    };
  }

  if (getNextInscripcionStates(currentState).includes(targetState)) {
    return { allowed: true, isOverride: false };
  }

  const isAdminOverrideRole =
    role === Role.ADMIN || role === Role.SUPER_ADMIN;
  const isAllowedReopen =
    (currentState === InscripcionState.RECHAZADO &&
      targetState === InscripcionState.PENDIENTE_VALIDACION) ||
    (currentState === InscripcionState.RETIRADO &&
      targetState === InscripcionState.MATRICULADO);

  if (isAdminOverrideRole && isAllowedReopen) {
    return { allowed: true, isOverride: true };
  }

  return {
    allowed: false,
    status: 400,
    reason: `Transición de inscripción no permitida (${currentState} → ${targetState}).`,
  };
}
