/**
 * Máquina de estados de las consultas de contacto (ciepi.consultas).
 *
 *   pendiente ──tomar──▶ en_proceso ──responder──▶ respondida ──cerrar──▶ cerrada
 *       │                    │                         │                    │
 *       ├──responder─────────┼────────────▶ respondida │                    │
 *       └──cerrar────────────┴────────────▶ cerrada    │                    │
 *                                  en_proceso ◀──reabrir (admin)────────────┘ (override)
 *
 * - "responder" exige el texto de la respuesta y siempre deja la consulta en
 *   "respondida"; cada respuesta se guarda además en ciepi.consultas_respuestas.
 * - "cerrada" es final: solo ADMIN/SUPER_ADMIN la reabren (override, con motivo).
 *
 * Roles: las consultas son atención ciudadana, así que los cuatro roles
 * administrativos (incluidos CIEPI y Relaciones Públicas) pueden tomarlas,
 * responderlas y cerrarlas. Reabrir y eliminar quedan para ADMIN/SUPER_ADMIN.
 */
import { Role } from "@/lib/permissions";
import {
  transicionesPermitidas,
  validarTransicion,
  type MapaTransiciones,
  type ResultadoTransicion,
  type TransicionDisponible,
} from "@/lib/estados/comun";

export const ESTADOS_CONSULTA = ["pendiente", "en_proceso", "respondida", "cerrada"] as const;
export type EstadoConsulta = (typeof ESTADOS_CONSULTA)[number];

export const ACCIONES_CONSULTA = ["tomar", "responder", "cerrar", "reabrir"] as const;
export type AccionConsulta = (typeof ACCIONES_CONSULTA)[number];

export const ETIQUETA_ESTADO_CONSULTA: Record<EstadoConsulta, string> = {
  pendiente: "Pendiente",
  en_proceso: "En proceso",
  respondida: "Respondida",
  cerrada: "Cerrada",
};

/** Roles que atienden consultas (tomar, responder, cerrar). */
export const ROLES_GESTION_CONSULTA: readonly number[] = [
  Role.ADMIN,
  Role.SUPER_ADMIN,
  Role.CIEPI,
  Role.RELACIONES_PUBLICAS,
];
/** Roles que pueden reabrir y eliminar consultas. */
export const ROLES_ADMIN_CONSULTA: readonly number[] = [Role.ADMIN, Role.SUPER_ADMIN];

/** Largo máximo del texto de una respuesta. */
export const MAX_RESPUESTA_CONSULTA = 5000;

export interface ContextoConsulta {
  rol?: number;
  [clave: string]: unknown;
}

const tomar = { a: "en_proceso", accion: "tomar", etiqueta: "Tomar consulta", roles: ROLES_GESTION_CONSULTA } as const;
const responder = { a: "respondida", accion: "responder", etiqueta: "Responder", roles: ROLES_GESTION_CONSULTA } as const;
const cerrar = { a: "cerrada", accion: "cerrar", etiqueta: "Cerrar", roles: ROLES_GESTION_CONSULTA } as const;

export const TRANSICIONES_CONSULTA: MapaTransiciones<EstadoConsulta, ContextoConsulta> = {
  pendiente: [tomar, responder, cerrar],
  en_proceso: [responder, cerrar],
  respondida: [cerrar, { a: "en_proceso", accion: "reabrir", etiqueta: "Reabrir", roles: ROLES_ADMIN_CONSULTA }],
  cerrada: [
    {
      a: "en_proceso",
      accion: "reabrir",
      etiqueta: "Reabrir",
      roles: ROLES_ADMIN_CONSULTA,
      requiereMotivo: true,
      override: true,
    },
  ],
};

export function esEstadoConsulta(valor: unknown): valor is EstadoConsulta {
  return typeof valor === "string" && (ESTADOS_CONSULTA as readonly string[]).includes(valor);
}

/** Transiciones que el rol puede ejecutar desde `estado` (para la API y la UI). */
export function transicionesConsulta(estado: string, rol: number | undefined): TransicionDisponible<EstadoConsulta>[] {
  if (!esEstadoConsulta(estado)) return [];
  return transicionesPermitidas(TRANSICIONES_CONSULTA, estado, { rol });
}

export function puedeEliminarConsulta(rol: number | undefined): boolean {
  return rol !== undefined && ROLES_ADMIN_CONSULTA.includes(rol);
}

export interface SolicitudAccionConsulta {
  /** Estado que el administrador veía al decidir (para detectar carreras). */
  estadoActual: unknown;
  /** Acción pedida ("tomar", "responder", ...). Alternativa: `estadoDestino`. */
  accion?: unknown;
  estadoDestino?: unknown;
  respuesta?: unknown;
  motivo?: unknown;
  rol?: number;
}

export type ResultadoAccionConsulta =
  | (Extract<ResultadoTransicion<EstadoConsulta>, { ok: true }> & {
      de: EstadoConsulta;
      respuesta: string | null;
      motivo: string | null;
    })
  | { ok: false; status: number; motivo: string };

/**
 * Valida una acción pedida a la API: estado leído, acción (o destino), rol,
 * motivo y, si es "responder", el texto de la respuesta.
 */
export function validarAccionConsulta(s: SolicitudAccionConsulta): ResultadoAccionConsulta {
  if (!esEstadoConsulta(s.estadoActual)) {
    return { ok: false, status: 400, motivo: "Falta el estado actual de la consulta o no es válido." };
  }
  const de = s.estadoActual;
  const accion = typeof s.accion === "string" ? s.accion.trim() : "";
  const destino = typeof s.estadoDestino === "string" ? s.estadoDestino.trim() : "";
  if (!accion && !destino) {
    return { ok: false, status: 400, motivo: "Indica la acción a realizar." };
  }
  const t = TRANSICIONES_CONSULTA[de].find((x) => (accion ? x.accion === accion : x.a === destino));
  if (!t) {
    const pedido = accion || ETIQUETA_ESTADO_CONSULTA[destino as EstadoConsulta] || destino;
    return {
      ok: false,
      status: 400,
      motivo: `No se puede «${pedido}» una consulta en estado «${ETIQUETA_ESTADO_CONSULTA[de]}».`,
    };
  }

  const motivo = typeof s.motivo === "string" && s.motivo.trim() ? s.motivo.trim().slice(0, 500) : null;
  const r = validarTransicion(TRANSICIONES_CONSULTA, de, t.a, { rol: s.rol, motivo });
  if (!r.ok) return r;

  let respuesta: string | null = null;
  if (t.accion === "responder") {
    respuesta = typeof s.respuesta === "string" ? s.respuesta.trim() : "";
    if (!respuesta) return { ok: false, status: 400, motivo: "Escribe la respuesta antes de enviarla." };
    if (respuesta.length > MAX_RESPUESTA_CONSULTA) {
      return {
        ok: false,
        status: 400,
        motivo: `La respuesta no puede superar ${MAX_RESPUESTA_CONSULTA} caracteres.`,
      };
    }
  }
  return { ...r, de, respuesta, motivo };
}
