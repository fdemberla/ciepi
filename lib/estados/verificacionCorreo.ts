/**
 * Máquina de estados del enlace de verificación de correo (ciepi.verificacion_correo).
 *
 *   pendiente ──(clic en el correo, canje completo)──▶ verificado   (final)
 *   pendiente ──(reenvío / nueva inscripción al mismo curso)──▶ invalidado (final)
 *   pendiente ──(pasa fecha_expiracion)──▶ expirado  (derivado; se puede reenviar)
 *
 * "expirado" no se guarda: se calcula con la fecha. Un reenvío reutiliza la misma
 * fila (nuevo token, nueva expiración) para que la página de espera no cambie de URL.
 */

export type EstadoVerificacionGuardado = "pendiente" | "verificado" | "invalidado";
export type EstadoVerificacion = EstadoVerificacionGuardado | "expirado";

export const ESTADOS_VERIFICACION_GUARDADOS: readonly EstadoVerificacionGuardado[] = [
  "pendiente",
  "verificado",
  "invalidado",
];

/** Minutos de validez de cada enlace. */
export const DURACION_ENLACE_MINUTOS = 15;
/** Reenvíos permitidos por inscripción. */
export const MAX_REENVIOS = 3;
/** Espera mínima entre reenvíos. */
export const ESPERA_REENVIO_SEGUNDOS = 60;

export interface FilaVerificacion {
  estado: EstadoVerificacionGuardado;
  fecha_expiracion: Date | string;
  fecha_creacion: Date | string;
  reenvios: number;
}

export function estadoEfectivo(fila: Pick<FilaVerificacion, "estado" | "fecha_expiracion">, ahora: Date): EstadoVerificacion {
  if (fila.estado !== "pendiente") return fila.estado;
  return ahora.getTime() > new Date(fila.fecha_expiracion).getTime() ? "expirado" : "pendiente";
}

export type ResultadoCanje =
  | { permitido: true }
  | { permitido: false; codigo: "TOKEN_ALREADY_USED" | "TOKEN_INVALIDATED" | "TOKEN_EXPIRED"; mensaje: string; status: number };

/** ¿Se puede canjear (clic en el enlace del correo)? "verificado" se trata aparte: es idempotente. */
export function validarCanje(fila: Pick<FilaVerificacion, "estado" | "fecha_expiracion">, ahora: Date): ResultadoCanje {
  switch (estadoEfectivo(fila, ahora)) {
    case "pendiente":
      return { permitido: true };
    case "verificado":
      return { permitido: false, codigo: "TOKEN_ALREADY_USED", mensaje: "Este enlace ya fue usado.", status: 409 };
    case "invalidado":
      return {
        permitido: false,
        codigo: "TOKEN_INVALIDATED",
        mensaje: "Este enlace fue reemplazado por uno más reciente. Usa el último correo que recibiste.",
        status: 410,
      };
    case "expirado":
      return { permitido: false, codigo: "TOKEN_EXPIRED", mensaje: "El enlace de verificación ha expirado.", status: 410 };
  }
}

export type ResultadoReenvio =
  | { permitido: true }
  | { permitido: false; mensaje: string; status: number; esperarSegundos?: number };

/** ¿Se puede reenviar el correo? Solo mientras no se haya verificado ni invalidado. */
export function validarReenvio(fila: FilaVerificacion, ahora: Date): ResultadoReenvio {
  if (fila.estado === "verificado") {
    return { permitido: false, mensaje: "Este correo ya fue verificado.", status: 409 };
  }
  if (fila.estado === "invalidado") {
    return { permitido: false, mensaje: "Esta solicitud fue reemplazada por una más reciente.", status: 410 };
  }
  if (fila.reenvios >= MAX_REENVIOS) {
    return {
      permitido: false,
      mensaje: "Alcanzaste el máximo de reenvíos. Vuelve a iniciar la inscripción.",
      status: 429,
    };
  }
  const transcurrido = (ahora.getTime() - new Date(fila.fecha_creacion).getTime()) / 1000;
  if (transcurrido < ESPERA_REENVIO_SEGUNDOS) {
    const esperar = Math.ceil(ESPERA_REENVIO_SEGUNDOS - transcurrido);
    return { permitido: false, mensaje: `Espera ${esperar} s antes de reenviar.`, status: 429, esperarSegundos: esperar };
  }
  return { permitido: true };
}
