/**
 * Máquina de estados de la sesión de inscripción pública (ciepi.inscripcion_sesiones).
 * La sesión vive en el servidor; el navegador solo guarda un identificador opaco
 * en una cookie httpOnly. Ningún dato de seguridad (identidad, biometría) viene del cliente.
 *
 *   cedula_verificada ──(fecha de nacimiento correcta)──▶ identidad_verificada
 *   cedula_verificada ──(demasiados intentos fallidos)──▶ bloqueada (final)
 *   identidad_verificada ──(biometría aprobada por el Hub)──▶ identidad_verificada (+ biometría)
 *   identidad_verificada ──(inscripción enviada)──▶ usada (final)
 */

export type EstadoSesion = "cedula_verificada" | "identidad_verificada" | "bloqueada" | "usada";

export const ESTADOS_SESION: readonly EstadoSesion[] = [
  "cedula_verificada",
  "identidad_verificada",
  "bloqueada",
  "usada",
];

const TRANSICIONES: Record<EstadoSesion, readonly EstadoSesion[]> = {
  cedula_verificada: ["identidad_verificada", "bloqueada"],
  identidad_verificada: ["usada"],
  bloqueada: [],
  usada: [],
};

export function transicionesSesion(estado: EstadoSesion): readonly EstadoSesion[] {
  return TRANSICIONES[estado];
}

export function puedeTransicionarSesion(desde: EstadoSesion, hacia: EstadoSesion): boolean {
  return TRANSICIONES[desde].includes(hacia);
}

/** Duración de la sesión (incluye el tiempo de la validación biométrica). */
export const DURACION_SESION_MINUTOS = 60;
/** Intentos de fecha de nacimiento por sesión. */
export const MAX_INTENTOS_FECHA_SESION = 5;
/** Intentos fallidos de fecha por cédula en 24 h (aunque se abran sesiones nuevas). */
export const MAX_FALLOS_FECHA_CEDULA_24H = 10;
/** Sesiones nuevas (consultas de cédula) por IP en una hora. */
export const MAX_SESIONES_IP_HORA = 15;

/** Resultado de un intento de fecha de nacimiento fallido. */
export function trasFalloFecha(intentosPrevios: number): { intentos: number; estado: EstadoSesion } {
  const intentos = intentosPrevios + 1;
  return { intentos, estado: intentos >= MAX_INTENTOS_FECHA_SESION ? "bloqueada" : "cedula_verificada" };
}

/** Normaliza una cédula para comparar (mayúsculas, sin espacios). */
export function normalizarCedula(cedula: string | null | undefined): string {
  return (cedula || "").trim().toUpperCase().replace(/\s+/g, "");
}
