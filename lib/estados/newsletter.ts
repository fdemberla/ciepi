/**
 * Máquina de estados de los suscriptores del newsletter (ciepi.newsletter_suscriptores).
 *
 *   (alta) ──(suscribirse, con consentimiento)──▶ pendiente
 *   pendiente ──(confirmar: token válido y vigente, por POST)──▶ activo
 *   pendiente ──(darse de baja)──▶ baja
 *   activo    ──(darse de baja)──▶ baja
 *   baja      ──(volver a suscribirse, nuevo consentimiento)──▶ pendiente
 *
 * Reglas:
 * - Confirmar solo lo hace el ciudadano, con el token del correo sin expirar.
 * - Darse de baja: el ciudadano (enlace firmado del boletín) o un administrador con
 *   rol de gestión del newsletter (ROLES_GESTION_NEWSLETTER).
 * - Volver a suscribirse solo lo hace el ciudadano y exige aceptar de nuevo la política.
 * - Un suscriptor "activo" nunca vuelve a "pendiente" por un nuevo envío del formulario.
 * - Reenviar el formulario estando "pendiente" no es una transición: renueva el token y
 *   queda en el historial como evento de consentimiento (accion "renovar_consentimiento").
 */

import { Role } from "@/lib/permissions";
import type { ContextoTransicion, MapaTransiciones } from "@/lib/estados/comun";

export type EstadoSuscriptor = "pendiente" | "activo" | "baja";

export const ESTADOS_SUSCRIPTOR: readonly EstadoSuscriptor[] = ["pendiente", "activo", "baja"];

export function esEstadoSuscriptor(valor: unknown): valor is EstadoSuscriptor {
  return typeof valor === "string" && (ESTADOS_SUSCRIPTOR as readonly string[]).includes(valor);
}

/** Horas de validez del enlace de confirmación. */
export const HORAS_VALIDEZ_CONFIRMACION = 24;

/**
 * Roles que pueden enviar el boletín, listar suscriptores y dar de baja a un suscriptor.
 * Relaciones Públicas gestiona la comunicación institucional; el rol CIEPI (editor de
 * contenidos) no accede a los datos personales de los suscriptores.
 */
export const ROLES_GESTION_NEWSLETTER: readonly number[] = [
  Role.ADMIN,
  Role.SUPER_ADMIN,
  Role.RELACIONES_PUBLICAS,
];

export function puedeGestionarNewsletter(rol: number | null | undefined): boolean {
  return rol !== null && rol !== undefined && ROLES_GESTION_NEWSLETTER.includes(rol);
}

export interface ContextoNewsletter extends ContextoTransicion {
  actor: "ciudadano" | "admin";
  /** Confirmar: el token del correo coincide con la fila. */
  tokenValido?: boolean;
  /** Confirmar: el token ya pasó su fecha de expiración. */
  tokenExpirado?: boolean;
  /** Volver a suscribirse: aceptó la Política de Privacidad en este envío. */
  aceptoPolitica?: boolean;
}

const soloCiudadano = (ctx: ContextoNewsletter) =>
  ctx.actor === "ciudadano" ? null : "Solo la persona titular del correo puede realizar este cambio.";

const guardaConfirmar = (ctx: ContextoNewsletter) => {
  if (ctx.actor !== "ciudadano") return "Solo la persona titular del correo puede confirmar la suscripción.";
  if (!ctx.tokenValido) return "El enlace de confirmación no es válido.";
  if (ctx.tokenExpirado) return "El enlace de confirmación ha expirado. Por favor, vuelve a suscribirte.";
  return null;
};

const guardaBaja = (ctx: ContextoNewsletter) => {
  if (ctx.actor === "ciudadano") return null;
  return puedeGestionarNewsletter(ctx.rol) ? null : "Tu rol no puede dar de baja suscriptores del newsletter.";
};

const guardaResuscribir = (ctx: ContextoNewsletter) =>
  soloCiudadano(ctx) ??
  (ctx.aceptoPolitica ? null : "Debes aceptar la Política de Privacidad para suscribirte al boletín.");

/** Los roles se controlan en las guardas: el ciudadano no tiene rol (undefined). */
export const TRANSICIONES_NEWSLETTER: MapaTransiciones<EstadoSuscriptor, ContextoNewsletter> = {
  pendiente: [
    { a: "activo", accion: "confirmar", etiqueta: "Confirmar suscripción", guarda: guardaConfirmar },
    { a: "baja", accion: "dar_de_baja", etiqueta: "Dar de baja", guarda: guardaBaja },
  ],
  activo: [{ a: "baja", accion: "dar_de_baja", etiqueta: "Dar de baja", guarda: guardaBaja }],
  baja: [{ a: "pendiente", accion: "resuscribir", etiqueta: "Volver a suscribirse", guarda: guardaResuscribir }],
};

// ─── Confirmación ────────────────────────────────────────────────────────────

export interface FilaConfirmacion {
  estado: EstadoSuscriptor;
  confirm_token_expiracion: Date | string | null;
}

export type EvaluacionConfirmacion =
  | { tipo: "confirmar" }
  | { tipo: "ya_confirmada" }
  | { tipo: "error"; status: number; codigo: string; mensaje: string };

export function tokenExpirado(fila: Pick<FilaConfirmacion, "confirm_token_expiracion">, ahora: Date): boolean {
  if (!fila.confirm_token_expiracion) return true;
  return new Date(fila.confirm_token_expiracion).getTime() <= ahora.getTime();
}

/**
 * Qué hacer con un enlace de confirmación (fila encontrada por hash del token, o null).
 * "ya_confirmada" es idempotente: repetir el clic no es un error.
 */
export function evaluarConfirmacion(fila: FilaConfirmacion | null, ahora: Date): EvaluacionConfirmacion {
  if (!fila) {
    return {
      tipo: "error",
      status: 404,
      codigo: "TOKEN_INVALIDO",
      mensaje: "El enlace de confirmación no es válido o fue reemplazado por uno más reciente.",
    };
  }
  if (fila.estado === "activo") return { tipo: "ya_confirmada" };
  if (fila.estado === "baja") {
    return {
      tipo: "error",
      status: 409,
      codigo: "SUSCRIPCION_DADA_DE_BAJA",
      mensaje: "Esta suscripción fue cancelada. Si deseas recibir el boletín, vuelve a suscribirte.",
    };
  }
  if (tokenExpirado(fila, ahora)) {
    return {
      tipo: "error",
      status: 410,
      codigo: "TOKEN_EXPIRADO",
      mensaje: "El enlace de confirmación ha expirado. Por favor, vuelve a suscribirte.",
    };
  }
  return { tipo: "confirmar" };
}

// ─── Alta / re-suscripción ──────────────────────────────────────────────────

/**
 * Evento de historial para un envío del formulario, según el estado anterior
 * (null = correo nuevo). Devuelve null si no hubo cambio (suscriptor activo).
 */
export function eventoSuscripcion(
  previo: EstadoSuscriptor | null
): { de: EstadoSuscriptor | null; a: EstadoSuscriptor; accion: string } | null {
  if (previo === null) return { de: null, a: "pendiente", accion: "suscribir" };
  if (previo === "baja") return { de: "baja", a: "pendiente", accion: "resuscribir" };
  if (previo === "pendiente") return { de: "pendiente", a: "pendiente", accion: "renovar_consentimiento" };
  return null;
}

/** Texto del motivo para los eventos de consentimiento (Ley 81 de 2019). */
export function motivoConsentimiento(versionPolitica: string): string {
  return `Aceptó la Política de Privacidad v${versionPolitica}`;
}
