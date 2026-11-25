/**
 * Máquina de estados de las reservas de mentoría (módulo puro, sin base de datos).
 *
 * Todo el grafo vive aquí: transiciones del administrador, de la persona que
 * reservó (desde el enlace del correo) y del sistema (cron / liberación del turno).
 *
 *   pendiente_verificacion ──confirmar (ciudadano)──▶ confirmada
 *          │  └─cancelar (admin, motivo)──▶ cancelada_ciepi
 *          └─expirar (sistema)──▶ expirada
 *   confirmada ──cancelar (ciudadano)──▶ cancelada_usuario        (antes de la sesión)
 *              ──cancelar (admin, motivo)──▶ cancelada_ciepi     (antes de la sesión)
 *              ──marcar realizada / inasistencia (admin)──▶ completada / no_asistio (desde que empieza)
 *   completada ⇄ no_asistio: corrección del admin (override, con motivo)
 *   expirada, cancelada_usuario, cancelada_ciepi: finales.
 *
 * "expirada" también es un estado derivado: una pendiente cuyo pendiente_expira ya
 * pasó se trata como expirada aunque el cron todavía no la haya marcado
 * (ver estadoEfectivoReserva). Por eso las transiciones se calculan con `ahora`.
 */
import {
  transicionesPermitidas,
  validarTransicion,
  type ContextoTransicion,
  type MapaTransiciones,
  type ResultadoTransicion,
  type TransicionDisponible,
} from "@/lib/estados/comun";

export const ESTADOS_RESERVA = [
  "pendiente_verificacion",
  "expirada",
  "confirmada",
  "completada",
  "no_asistio",
  "cancelada_usuario",
  "cancelada_ciepi",
] as const;
export type EstadoReserva = (typeof ESTADOS_RESERVA)[number];

export const ETIQUETA_ESTADO_RESERVA: Record<EstadoReserva, string> = {
  pendiente_verificacion: "Pendiente de confirmar",
  expirada: "Expirada",
  confirmada: "Confirmada",
  completada: "Realizada",
  no_asistio: "No asistió",
  cancelada_usuario: "Cancelada por la persona",
  cancelada_ciepi: "Cancelada por CIEPI",
};

/** Estados que ocupan el horario del mentor (si la pendiente sigue vigente). */
export const ESTADOS_RESERVA_ACTIVOS: readonly EstadoReserva[] = ["pendiente_verificacion", "confirmada"];

export type ActorReserva = "admin" | "ciudadano" | "sistema";

export interface ContextoReserva extends ContextoTransicion {
  actor: ActorReserva;
  /** La sesión ya empezó (inicio <= ahora). */
  empezo: boolean;
  /** Pendiente cuyo plazo para confirmar ya venció. */
  vencida: boolean;
  /** El mentor sigue activo y como mentor. undefined = no se comprobó. */
  mentorActivo?: boolean;
}

const soloActor =
  (actor: ActorReserva, mensaje: string) =>
  (ctx: ContextoReserva): string | null =>
    ctx.actor === actor ? null : mensaje;

/** Combina guardas: devuelve el primer bloqueo. */
const todas =
  (...gs: ((ctx: ContextoReserva) => string | null)[]) =>
  (ctx: ContextoReserva): string | null => {
    for (const g of gs) {
      const m = g(ctx);
      if (m) return m;
    }
    return null;
  };

const SOLO_ADMIN = soloActor("admin", "Solo CIEPI puede hacer este cambio.");
const SOLO_CIUDADANO = soloActor("ciudadano", "Solo la persona que reservó puede hacer este cambio.");
const SOLO_SISTEMA = soloActor("sistema", "Este cambio lo hace el sistema automáticamente.");
const ANTES_DE_EMPEZAR = (ctx: ContextoReserva) =>
  ctx.empezo ? "La sesión ya empezó: ya no se puede cancelar." : null;
const DESDE_QUE_EMPIEZA = (ctx: ContextoReserva) =>
  ctx.empezo ? null : "La sesión todavía no empieza.";
const NO_VENCIDA = (ctx: ContextoReserva) =>
  ctx.vencida ? "El tiempo para confirmar venció y el horario se liberó." : null;
const MENTOR_ACTIVO = (ctx: ContextoReserva) =>
  ctx.mentorActivo === false ? "Este mentor ya no está disponible." : null;

export const TRANSICIONES_RESERVA: MapaTransiciones<EstadoReserva, ContextoReserva> = {
  pendiente_verificacion: [
    {
      a: "confirmada",
      accion: "confirmar",
      etiqueta: "Confirmar reserva",
      guarda: todas(SOLO_CIUDADANO, NO_VENCIDA, MENTOR_ACTIVO, ANTES_DE_EMPEZAR),
    },
    {
      a: "cancelada_ciepi",
      accion: "cancelar",
      etiqueta: "Cancelar reserva",
      requiereMotivo: true,
      guarda: todas(SOLO_ADMIN, NO_VENCIDA, ANTES_DE_EMPEZAR),
    },
    {
      // El cron (plazo vencido) o la creación cuando no se pudo enviar el correo de verificación.
      a: "expirada",
      accion: "expirar",
      etiqueta: "Expirar",
      guarda: SOLO_SISTEMA,
    },
  ],
  confirmada: [
    {
      a: "cancelada_usuario",
      accion: "cancelar",
      etiqueta: "Cancelar mi reserva",
      guarda: todas(SOLO_CIUDADANO, ANTES_DE_EMPEZAR),
    },
    {
      a: "cancelada_ciepi",
      accion: "cancelar",
      etiqueta: "Cancelar reserva",
      requiereMotivo: true,
      guarda: todas(SOLO_ADMIN, ANTES_DE_EMPEZAR),
    },
    {
      a: "completada",
      accion: "marcar_realizada",
      etiqueta: "Marcar como realizada",
      guarda: todas(SOLO_ADMIN, DESDE_QUE_EMPIEZA),
    },
    {
      a: "no_asistio",
      accion: "marcar_inasistencia",
      etiqueta: "Marcar inasistencia",
      guarda: todas(SOLO_ADMIN, DESDE_QUE_EMPIEZA),
    },
  ],
  completada: [
    {
      a: "no_asistio",
      accion: "corregir",
      etiqueta: "Corregir: no asistió",
      requiereMotivo: true,
      override: true,
      guarda: SOLO_ADMIN,
    },
  ],
  no_asistio: [
    {
      a: "completada",
      accion: "corregir",
      etiqueta: "Corregir: sí se realizó",
      requiereMotivo: true,
      override: true,
      guarda: SOLO_ADMIN,
    },
  ],
  expirada: [],
  cancelada_usuario: [],
  cancelada_ciepi: [],
};

export function esEstadoReserva(v: unknown): v is EstadoReserva {
  return typeof v === "string" && (ESTADOS_RESERVA as readonly string[]).includes(v);
}

/** Una pendiente cuyo plazo venció se trata como expirada. */
export function pendienteVencida(
  estado: string,
  pendienteExpira: Date | string | null | undefined,
  ahora: Date
): boolean {
  return (
    estado === "pendiente_verificacion" &&
    pendienteExpira != null &&
    new Date(pendienteExpira).getTime() <= ahora.getTime()
  );
}

/** Estado que se muestra y con el que se calculan las transiciones visibles. */
export function estadoEfectivoReserva(
  estado: string,
  pendienteExpira: Date | string | null | undefined,
  ahora: Date
): string {
  return pendienteVencida(estado, pendienteExpira, ahora) ? "expirada" : estado;
}

export interface DatosReserva {
  estado: string;
  inicio: Date | string;
  pendiente_expira?: Date | string | null;
}

export interface OpcionesContexto {
  actor: ActorReserva;
  ahora: Date;
  rol?: number;
  mentorActivo?: boolean;
}

export function contextoReserva(r: DatosReserva, o: OpcionesContexto): ContextoReserva {
  return {
    actor: o.actor,
    rol: o.rol,
    empezo: new Date(r.inicio).getTime() <= o.ahora.getTime(),
    vencida: pendienteVencida(r.estado, r.pendiente_expira, o.ahora),
    mentorActivo: o.mentorActivo,
  };
}

/**
 * Transiciones que el actor puede ejecutar ahora sobre la reserva (para la API y la UI).
 * Una pendiente vencida se trata como expirada: no tiene transiciones visibles
 * (salvo para el sistema, que la marca como expirada).
 */
export function transicionesReserva(r: DatosReserva, o: OpcionesContexto): TransicionDisponible<EstadoReserva>[] {
  const ctx = contextoReserva(r, o);
  const estado = o.actor === "sistema" ? r.estado : estadoEfectivoReserva(r.estado, r.pendiente_expira, o.ahora);
  if (!esEstadoReserva(estado)) return [];
  return transicionesPermitidas(TRANSICIONES_RESERVA, estado, ctx);
}

/** Valida un cambio concreto (servidor), con el mismo contexto que transicionesReserva. */
export function validarTransicionReserva(
  r: DatosReserva,
  a: string,
  o: OpcionesContexto & { motivo?: string | null }
): ResultadoTransicion<EstadoReserva> {
  if (!esEstadoReserva(r.estado) || !esEstadoReserva(a)) {
    return { ok: false, status: 400, motivo: "Estado inválido." };
  }
  const ctx = contextoReserva(r, o);
  // Para personas y admins, una pendiente vencida ya es "expirada": no se confirma ni se cancela.
  if (o.actor !== "sistema" && ctx.vencida) {
    return { ok: false, status: 410, motivo: "El tiempo para confirmar venció y el horario se liberó." };
  }
  return validarTransicion(TRANSICIONES_RESERVA, r.estado, a, { ...ctx, motivo: o.motivo });
}

/** Mensaje de error legible para un cambio no permitido. */
export function mensajeTransicionNoPermitida(de: string, a: string): string {
  const et = (e: string) => ETIQUETA_ESTADO_RESERVA[e as EstadoReserva] ?? e;
  return `No se puede pasar de «${et(de)}» a «${et(a)}».`;
}

// ---------------------------------------------------------------- desactivar mentor

export interface ReservaAfectada {
  id: number;
  estado: string;
  inicio: Date | string;
  pendiente_expira?: Date | string | null;
}

/**
 * Reservas que quedan huérfanas si el mentor se desactiva: confirmadas o pendientes
 * vigentes que todavía no empiezan.
 */
export function reservasAfectadasPorDesactivacion<T extends ReservaAfectada>(reservas: T[], ahora: Date): T[] {
  return reservas.filter((r) => {
    const efectivo = estadoEfectivoReserva(r.estado, r.pendiente_expira, ahora);
    return (
      (efectivo === "confirmada" || efectivo === "pendiente_verificacion") &&
      new Date(r.inicio).getTime() > ahora.getTime()
    );
  });
}

export type DecisionDesactivacion<T> =
  | { tipo: "continuar" }
  | { tipo: "bloquear"; reservas: T[] }
  | { tipo: "cancelar"; reservas: T[] };

/**
 * Qué hacer al guardar un profesor con sus reservas activas:
 * - si sigue activo como mentor, o no tiene reservas afectadas → continuar;
 * - si deja de atender y el admin no pidió cancelarlas → bloquear (409 con la lista);
 * - si el admin pidió cancelarlas (cancelar_reservas: true) → cancelarlas como cancelada_ciepi.
 */
export function decidirDesactivacionMentor<T extends ReservaAfectada>(o: {
  esMentor: boolean;
  activo: boolean;
  reservas: T[];
  cancelarReservas: boolean;
  ahora: Date;
}): DecisionDesactivacion<T> {
  if (o.esMentor && o.activo) return { tipo: "continuar" };
  const afectadas = reservasAfectadasPorDesactivacion(o.reservas, o.ahora);
  if (afectadas.length === 0) return { tipo: "continuar" };
  return o.cancelarReservas ? { tipo: "cancelar", reservas: afectadas } : { tipo: "bloquear", reservas: afectadas };
}

/** Motivo por defecto al cancelar reservas porque el mentor dejó de atender. */
export const MOTIVO_MENTOR_NO_DISPONIBLE =
  "El mentor ya no está disponible. Puedes reservar con otro mentor en el portal de CIEPI.";
