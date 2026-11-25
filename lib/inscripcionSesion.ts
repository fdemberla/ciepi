import { randomBytes, createHash } from "crypto";
import type { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  DURACION_SESION_MINUTOS,
  MAX_FALLOS_FECHA_CEDULA_24H,
  MAX_SESIONES_IP_HORA,
  type EstadoSesion,
} from "@/lib/estados/inscripcionSesion";

/**
 * Sesión de inscripción pública guardada en el servidor (ver lib/estados/inscripcionSesion.ts).
 */

export const COOKIE_SESION_INSCRIPCION = "ciepi_inscripcion";

export interface DatosPersona {
  id?: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  nombre_cedula: string;
  estado_civil: string | null;
  fecha_nacimiento: string | null;
  correo?: string | null;
  telefono?: string | null;
  sexo: string | null;
}

/** Resultado biométrico validado por el servidor contra el Hub. */
export interface BiometriaServidor {
  valido: true;
  estado: string;
  id_auditoria: string;
  score_similitud: number | null;
  liveness_score: number | null;
  metodo_autenticacion: string | null;
  fecha: string;
}

export interface SesionInscripcion {
  id: number;
  cedula: string;
  id_capacitacion: number | null;
  estado: EstadoSesion;
  intentos_fecha: number;
  id_estudiante: number | null;
  datos_persona: DatosPersona;
  biometria: BiometriaServidor | null;
  fecha_expiracion: Date;
}

export function hashSecreto(valor: string): string {
  return createHash("sha256").update(valor).digest("hex");
}

export function generarSecreto(): string {
  return randomBytes(32).toString("hex");
}

export async function crearSesion(params: {
  cedula: string;
  idCapacitacion: number | null;
  idEstudiante: number | null;
  datosPersona: DatosPersona;
  ip: string | null;
}): Promise<string> {
  const token = generarSecreto();
  await query(
    `INSERT INTO ciepi.inscripcion_sesiones
       (token_hash, cedula, id_capacitacion, id_estudiante, datos_persona, ip, fecha_expiracion)
     VALUES ($1, $2, $3, $4, $5, $6, NOW() + ($7 || ' minutes')::interval)`,
    [
      hashSecreto(token),
      params.cedula,
      params.idCapacitacion,
      params.idEstudiante,
      JSON.stringify(params.datosPersona),
      params.ip,
      String(DURACION_SESION_MINUTOS),
    ]
  );
  return token;
}

/** Sesión vigente asociada a la cookie, o null. */
export async function obtenerSesion(request: NextRequest): Promise<SesionInscripcion | null> {
  const token = request.cookies.get(COOKIE_SESION_INSCRIPCION)?.value;
  if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
  const res = await query(
    `SELECT id, cedula, id_capacitacion, estado, intentos_fecha, id_estudiante,
            datos_persona, biometria, fecha_expiracion
       FROM ciepi.inscripcion_sesiones
      WHERE token_hash = $1 AND fecha_expiracion > NOW()`,
    [hashSecreto(token)]
  );
  return (res.rows[0] as SesionInscripcion | undefined) ?? null;
}

export function ponerCookieSesion(res: NextResponse, token: string): void {
  res.cookies.set(COOKIE_SESION_INSCRIPCION, token, {
    httpOnly: true,
    sameSite: "lax", // debe viajar al volver del Hub biométrico
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACION_SESION_MINUTOS * 60,
  });
}

export function borrarCookieSesion(res: NextResponse): void {
  res.cookies.set(COOKIE_SESION_INSCRIPCION, "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** true si esta IP ya abrió demasiadas sesiones en la última hora. */
export async function superaLimiteSesionesIp(ip: string | null): Promise<boolean> {
  const res = await query(
    `SELECT COUNT(*)::int AS n FROM ciepi.inscripcion_sesiones
      WHERE ip IS NOT DISTINCT FROM $1 AND fecha_creacion > NOW() - INTERVAL '1 hour'`,
    [ip]
  );
  return res.rows[0].n >= MAX_SESIONES_IP_HORA;
}

/** true si la cédula acumula demasiados intentos fallidos de fecha en 24 h. */
export async function cedulaBloqueadaPorIntentos(cedula: string): Promise<boolean> {
  const res = await query(
    `SELECT COALESCE(SUM(intentos_fecha), 0)::int AS n FROM ciepi.inscripcion_sesiones
      WHERE cedula = $1 AND fecha_creacion > NOW() - INTERVAL '24 hours'`,
    [cedula]
  );
  return res.rows[0].n >= MAX_FALLOS_FECHA_CEDULA_24H;
}

/** Ubicación guardada de un estudiante existente (para precargar el formulario). */
export async function ubicacionEstudiante(idEstudiante: number) {
  const res = await query(
    `SELECT provincia_id, distrito_id, corregimiento_id
       FROM ciepi.estudiantes_ubicacion WHERE id_usuario = $1`,
    [idEstudiante]
  );
  return res.rows[0] ?? null;
}

/** Datos que el asistente necesita para mostrar el formulario (sin datos de seguridad). */
export async function vistaSesion(sesion: SesionInscripcion) {
  return {
    cedula: sesion.cedula,
    exists: sesion.id_estudiante !== null,
    estudiante: { ...sesion.datos_persona, id: sesion.id_estudiante ?? undefined },
    ubicacion: sesion.id_estudiante ? await ubicacionEstudiante(sesion.id_estudiante) : null,
    biometria: sesion.biometria
      ? {
          valido: true,
          estado: sesion.biometria.estado,
          id_auditoria: sesion.biometria.id_auditoria,
        }
      : null,
  };
}
