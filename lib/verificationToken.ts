import { randomBytes, createHash } from "crypto";
import { query } from "./db";

/**
 * Genera un token seguro y único para verificación de correo
 * @returns Token aleatorio de 64 caracteres hexadecimales
 */
export function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hash de un token para comparación segura
 * @param token Token a hashear
 * @returns Hash SHA256 del token
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Interfaz para crear un token de verificación
 */
export interface CreateVerificationTokenParams {
  id_estudiante: number;
  correo: string;
  tipo: "inscripcion" | "recuperacion" | "cambio_correo";
  metadata?: Record<string, unknown>;
  duracion_minutos?: number;
  ip?: string;
}

/**
 * Crea un token de verificación en la base de datos
 * @param params Parámetros para crear el token
 * @returns Token generado y datos del registro
 */
export async function createVerificationToken(
  params: CreateVerificationTokenParams
) {
  const {
    id_estudiante,
    correo,
    tipo,
    metadata = {},
    duracion_minutos = 15,
    ip = null,
  } = params;

  const token = generateSecureToken();
  const fecha_expiracion = new Date();
  fecha_expiracion.setMinutes(fecha_expiracion.getMinutes() + duracion_minutos);

  const result = await query(
    `INSERT INTO ciepi.verificacion_correo (
      id_estudiante, token, correo, tipo, metadata, 
      fecha_expiracion, ip_creacion
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, token, fecha_expiracion`,
    [
      id_estudiante,
      token,
      correo,
      tipo,
      JSON.stringify(metadata),
      fecha_expiracion,
      ip,
    ]
  );

  return {
    token,
    id: result.rows[0].id,
    fecha_expiracion: result.rows[0].fecha_expiracion,
  };
}

/**
 * Interfaz para el resultado de validación de token
 */
export interface ValidateTokenResult {
  valid: boolean;
  used?: boolean;
  expired?: boolean;
  not_found?: boolean;
  data?: {
    id: number;
    id_estudiante: number;
    correo: string;
    tipo: string;
    metadata: Record<string, unknown>;
    fecha_creacion: Date;
    fecha_expiracion: Date;
  };
}

/**
 * Valida un token de verificación
 * @param token Token a validar
 * @returns Resultado de la validación
 */
export async function validateVerificationToken(
  token: string
): Promise<ValidateTokenResult> {
  const result = await query(
    `SELECT id, id_estudiante, correo, tipo, metadata, usado,
            fecha_creacion, fecha_expiracion
     FROM ciepi.verificacion_correo
     WHERE token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    return { valid: false, not_found: true };
  }

  const tokenData = result.rows[0];

  // Verificar si ya fue usado
  if (tokenData.usado) {
    return { valid: false, used: true };
  }

  // Verificar si expiró
  const now = new Date();
  const expiration = new Date(tokenData.fecha_expiracion);
  if (now > expiration) {
    return { valid: false, expired: true };
  }

  return {
    valid: true,
    data: {
      id: tokenData.id,
      id_estudiante: tokenData.id_estudiante,
      correo: tokenData.correo,
      tipo: tokenData.tipo,
      metadata: tokenData.metadata,
      fecha_creacion: tokenData.fecha_creacion,
      fecha_expiracion: tokenData.fecha_expiracion,
    },
  };
}

/**
 * Marca un token como usado
 * @param token Token a marcar como usado
 * @param ip Dirección IP desde donde se usó (opcional)
 * @returns True si se marcó correctamente
 */
export async function markTokenAsUsed(
  token: string,
  ip?: string
): Promise<boolean> {
  const result = await query(
    `UPDATE ciepi.verificacion_correo
     SET usado = true, fecha_uso = CURRENT_TIMESTAMP, ip_uso = $2
     WHERE token = $1 AND usado = false
     RETURNING id`,
    [token, ip || null]
  );

  return result.rows.length > 0;
}

/**
 * Verifica el estado de un token (para polling)
 * @param token Token a verificar
 * @returns Estado del token
 */
export async function checkTokenStatus(token: string): Promise<{
  exists: boolean;
  usado: boolean;
  expirado: boolean;
}> {
  const result = await query(
    `SELECT usado, fecha_expiracion
     FROM ciepi.verificacion_correo
     WHERE token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    return { exists: false, usado: false, expirado: false };
  }

  const tokenData = result.rows[0];
  const now = new Date();
  const expiration = new Date(tokenData.fecha_expiracion);

  return {
    exists: true,
    usado: tokenData.usado,
    expirado: now > expiration,
  };
}

/**
 * Invalida todos los tokens anteriores de un estudiante para un tipo específico
 * Útil para asegurar que solo el token más reciente sea válido
 * @param id_estudiante ID del estudiante
 * @param tipo Tipo de token
 */
export async function invalidatePreviousTokens(
  id_estudiante: number,
  tipo: string
): Promise<void> {
  await query(
    `UPDATE ciepi.verificacion_correo
     SET usado = true
     WHERE id_estudiante = $1 AND tipo = $2 AND usado = false`,
    [id_estudiante, tipo]
  );
}

/**
 * Limpia tokens expirados de la base de datos (tarea de mantenimiento)
 * @param dias_antiguedad Días de antigüedad para eliminar (default: 7)
 * @returns Número de tokens eliminados
 */
export async function cleanupExpiredTokens(
  dias_antiguedad: number = 7
): Promise<number> {
  const fecha_limite = new Date();
  fecha_limite.setDate(fecha_limite.getDate() - dias_antiguedad);

  const result = await query(
    `DELETE FROM ciepi.verificacion_correo
     WHERE fecha_expiracion < $1
     RETURNING id`,
    [fecha_limite]
  );

  return result.rows.length;
}

/**
 * Obtiene información de un token por su valor
 * @param token Token a buscar
 * @returns Información del token o null si no existe
 */
export async function getTokenInfo(token: string) {
  const result = await query(
    `SELECT v.id, v.id_estudiante, v.correo, v.tipo, v.metadata,
            v.usado, v.fecha_creacion, v.fecha_expiracion, v.fecha_uso,
            e.nombres, e.apellidos, e.cedula
     FROM ciepi.verificacion_correo v
     INNER JOIN ciepi.estudiantes e ON v.id_estudiante = e.id
     WHERE v.token = $1`,
    [token]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}
