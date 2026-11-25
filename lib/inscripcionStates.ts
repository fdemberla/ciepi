import { Role } from "@/lib/permissions";
import {
  transicionesPermitidas,
  validarTransicion,
  type ContextoTransicion,
  type MapaTransiciones,
  type ResultadoTransicion,
  type TransicionDisponible,
} from "@/lib/estados/comun";

/**
 * Máquina de estados de las inscripciones (ciepi.inscripciones.estado_inscripcion).
 * Única fuente de verdad: la API, la UI (EstadoSelector) y los tests usan este mapa.
 *
 *   1 Nueva ──────────▶ 6 Pendiente de validación, 3 Matriculado, 2 Rechazado*
 *   6 Pendiente ──────▶ 3 Matriculado, 2 Rechazado*, 1 Nueva (identidad validada)
 *   3 Matriculado ────▶ 5 Terminó curso, 4 Retirado*
 *   2, 4, 5 son finales. Admin / Super Admin pueden reabrirlos (override, con motivo):
 *   2 → 6, 4 → 3, 5 → 3 (corregir un cierre por error).
 *   (*) exige motivo.
 *
 * Los ids son fijos y están sembrados en database/fase2/10_inscripciones.sql.
 */
export enum InscripcionState {
  NUEVA = 1,
  RECHAZADO = 2,
  MATRICULADO = 3,
  RETIRADO = 4,
  TERMINO_CURSO = 5,
  PENDIENTE_VALIDACION = 6,
}

export const ALL_INSCRIPCION_STATES: readonly InscripcionState[] = [
  InscripcionState.NUEVA,
  InscripcionState.RECHAZADO,
  InscripcionState.MATRICULADO,
  InscripcionState.RETIRADO,
  InscripcionState.TERMINO_CURSO,
  InscripcionState.PENDIENTE_VALIDACION,
];

/** Nombres sembrados en ciepi.inscripciones_estados (respaldo si la BD no los trae). */
export const NOMBRE_ESTADO_INSCRIPCION: Record<InscripcionState, string> = {
  [InscripcionState.NUEVA]: "Nueva inscripción",
  [InscripcionState.RECHAZADO]: "Rechazado",
  [InscripcionState.MATRICULADO]: "Matriculado",
  [InscripcionState.RETIRADO]: "Retirado",
  [InscripcionState.TERMINO_CURSO]: "Terminó curso",
  [InscripcionState.PENDIENTE_VALIDACION]: "Pendiente de validación",
};

export function isValidInscripcionState(value: number): value is InscripcionState {
  return ALL_INSCRIPCION_STATES.includes(value as InscripcionState);
}

/** Roles que pueden cambiar estados de inscripción. Relaciones Públicas solo consulta. */
export const ROLES_GESTION_INSCRIPCION: readonly number[] = [Role.ADMIN, Role.SUPER_ADMIN, Role.CIEPI];
/** Roles que pueden reabrir estados finales (override). */
export const ROLES_OVERRIDE_INSCRIPCION: readonly number[] = [Role.ADMIN, Role.SUPER_ADMIN];

export function puedeGestionarInscripciones(rol: number | undefined | null): boolean {
  return rol !== undefined && rol !== null && ROLES_GESTION_INSCRIPCION.includes(rol);
}

const G = ROLES_GESTION_INSCRIPCION;
const O = ROLES_OVERRIDE_INSCRIPCION;
const S = InscripcionState;

export const TRANSICIONES_INSCRIPCION: MapaTransiciones<InscripcionState> = {
  [S.NUEVA]: [
    { a: S.PENDIENTE_VALIDACION, accion: "enviar_validacion", etiqueta: "Enviar a validación", roles: G },
    { a: S.MATRICULADO, accion: "matricular", etiqueta: "Matricular", roles: G },
    { a: S.RECHAZADO, accion: "rechazar", etiqueta: "Rechazar", roles: G, requiereMotivo: true },
  ],
  [S.PENDIENTE_VALIDACION]: [
    { a: S.MATRICULADO, accion: "matricular", etiqueta: "Matricular", roles: G },
    { a: S.RECHAZADO, accion: "rechazar", etiqueta: "Rechazar", roles: G, requiereMotivo: true },
    { a: S.NUEVA, accion: "validar_identidad", etiqueta: "Marcar identidad validada", roles: G },
  ],
  [S.MATRICULADO]: [
    { a: S.TERMINO_CURSO, accion: "terminar_curso", etiqueta: "Marcar curso terminado", roles: G },
    { a: S.RETIRADO, accion: "retirar", etiqueta: "Retirar", roles: G, requiereMotivo: true },
  ],
  [S.RECHAZADO]: [
    {
      a: S.PENDIENTE_VALIDACION,
      accion: "reabrir",
      etiqueta: "Reabrir (volver a pendiente)",
      roles: O,
      requiereMotivo: true,
      override: true,
    },
  ],
  [S.RETIRADO]: [
    { a: S.MATRICULADO, accion: "reincorporar", etiqueta: "Reincorporar", roles: O, requiereMotivo: true, override: true },
  ],
  [S.TERMINO_CURSO]: [
    {
      a: S.MATRICULADO,
      accion: "corregir",
      etiqueta: "Corregir: volver a Matriculado",
      roles: O,
      requiereMotivo: true,
      override: true,
    },
  ],
};

/** Transiciones que el rol puede ejecutar desde `estado` (las que la API envía a la UI). */
export function transicionesInscripcion(
  estado: number,
  rol: number | undefined | null
): TransicionDisponible<InscripcionState>[] {
  if (!isValidInscripcionState(estado)) return [];
  return transicionesPermitidas<InscripcionState, ContextoTransicion>(TRANSICIONES_INSCRIPCION, estado, {
    rol: rol ?? undefined,
  });
}

/** Valida un cambio concreto en el servidor (estado, rol y motivo). */
export function validarTransicionInscripcion(
  de: number,
  a: number,
  ctx: { rol: number | undefined | null; motivo?: string | null }
): ResultadoTransicion<InscripcionState> {
  if (!isValidInscripcionState(de) || !isValidInscripcionState(a)) {
    return { ok: false, status: 400, motivo: "Estado de inscripción inválido." };
  }
  return validarTransicion<InscripcionState, ContextoTransicion>(TRANSICIONES_INSCRIPCION, de, a, {
    rol: ctx.rol ?? undefined,
    motivo: ctx.motivo ?? null,
  });
}

/** Destinos normales (sin overrides) desde `estado`. */
export function getNextInscripcionStates(currentState: InscripcionState): InscripcionState[] {
  return (TRANSICIONES_INSCRIPCION[currentState] ?? []).filter((t) => !t.override).map((t) => t.a);
}
