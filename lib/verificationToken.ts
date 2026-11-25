import { query, withTransaction } from "./db";
import { generarSecreto, hashSecreto } from "./inscripcionSesion";
import {
  DURACION_ENLACE_MINUTOS,
  estadoEfectivo,
  validarReenvio,
  type EstadoVerificacion,
  type EstadoVerificacionGuardado,
  type ResultadoReenvio,
} from "./estados/verificacionCorreo";

/**
 * Enlaces de verificación de correo (ciepi.verificacion_correo).
 *
 * Cada solicitud tiene DOS secretos distintos:
 *  - token: va SOLO en el correo; quien lo tiene demuestra acceso al buzón.
 *  - consulta: lo recibe el navegador para la página de espera (consultar estado y
 *    pedir reenvío). No sirve para verificar.
 * En la base solo se guardan sus hashes SHA-256.
 */

export { hashSecreto as hashToken };

export type TipoVerificacion = "inscripcion";

export interface CreateVerificationTokenParams {
  id_estudiante: number | null;
  cedula: string;
  correo: string;
  tipo: TipoVerificacion;
  metadata: Record<string, unknown> & { capacitacion_id?: number | string };
  ip?: string | null;
}

export interface FilaVerificacionCompleta {
  id: number;
  id_estudiante: number | null;
  cedula: string | null;
  correo: string;
  tipo: string;
  metadata: Record<string, unknown>;
  estado: EstadoVerificacionGuardado;
  reenvios: number;
  resultado: Record<string, unknown> | null;
  fecha_creacion: Date;
  fecha_expiracion: Date;
}

// Las columnas de fecha son "timestamp without time zone": se escriben y comparan
// siempre desde Node (como el resto de la app) para no mezclar zonas horarias.
function expiracionDesde(ahora: Date): Date {
  return new Date(ahora.getTime() + DURACION_ENLACE_MINUTOS * 60_000);
}

const COLUMNAS = `id, id_estudiante, cedula, correo, tipo, metadata, estado, reenvios, resultado,
                  fecha_creacion, fecha_expiracion`;

/**
 * Crea la solicitud de verificación. Invalida las solicitudes pendientes de la misma
 * cédula PARA LA MISMA capacitación (no las de otros cursos).
 */
export async function createVerificationToken(params: CreateVerificationTokenParams) {
  const token = generarSecreto();
  const consulta = generarSecreto();
  const ahora = new Date();
  const capacitacionId = params.metadata.capacitacion_id != null ? String(params.metadata.capacitacion_id) : null;

  const fila = await withTransaction(async (q) => {
    await q(
      `UPDATE ciepi.verificacion_correo
          SET estado = 'invalidado', usado = true
        WHERE cedula = $1 AND tipo = $2 AND estado = 'pendiente'
          AND metadata->>'capacitacion_id' IS NOT DISTINCT FROM $3`,
      [params.cedula, params.tipo, capacitacionId]
    );
    const res = await q(
      `INSERT INTO ciepi.verificacion_correo
         (id_estudiante, cedula, token, consulta_hash, correo, tipo, metadata,
          estado, usado, fecha_creacion, fecha_expiracion, ip_creacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pendiente', false, $8, $9, $10)
       RETURNING id, fecha_expiracion`,
      [
        params.id_estudiante,
        params.cedula,
        hashSecreto(token),
        hashSecreto(consulta),
        params.correo,
        params.tipo,
        JSON.stringify(params.metadata),
        ahora,
        expiracionDesde(ahora),
        params.ip ?? null,
      ]
    );
    return res.rows[0] as { id: number; fecha_expiracion: Date };
  });

  return { token, consulta, id: fila.id, fecha_expiracion: fila.fecha_expiracion };
}

async function buscarPor(columna: "token" | "consulta_hash", secreto: string): Promise<FilaVerificacionCompleta | null> {
  if (!/^[a-f0-9]{64}$/.test(secreto)) return null;
  const res = await query(`SELECT ${COLUMNAS} FROM ciepi.verificacion_correo WHERE ${columna} = $1`, [
    hashSecreto(secreto),
  ]);
  return (res.rows[0] as FilaVerificacionCompleta | undefined) ?? null;
}

export const buscarPorToken = (token: string) => buscarPor("token", token);
export const buscarPorConsulta = (consulta: string) => buscarPor("consulta_hash", consulta);

/** Estado para la página de espera. */
export async function estadoPorConsulta(
  consulta: string
): Promise<{ estado: EstadoVerificacion; reenvios: number; correo: string } | null> {
  const fila = await buscarPorConsulta(consulta);
  if (!fila) return null;
  return { estado: estadoEfectivo(fila, new Date()), reenvios: fila.reenvios, correo: fila.correo };
}

export type ResultadoReenvioToken =
  | { ok: true; token: string; consulta: string | null; fila: FilaVerificacionCompleta; fecha_expiracion: Date }
  | { ok: false; status: number; mensaje: string };

/**
 * Reenvía sobre la MISMA fila: nuevo token, nueva expiración, reenvios + 1.
 * El enlace anterior deja de servir. Si se pide con el token del correo (enlace
 * vencido), también se genera una consulta nueva para la página de espera.
 */
export async function reenviarVerificacion(
  por: { consulta: string } | { token: string }
): Promise<ResultadoReenvioToken> {
  const fila = "consulta" in por ? await buscarPorConsulta(por.consulta) : await buscarPorToken(por.token);
  if (!fila) return { ok: false, status: 404, mensaje: "Solicitud de verificación no encontrada." };

  const ahora = new Date();
  const decision: ResultadoReenvio = validarReenvio(fila, ahora);
  if (!decision.permitido) return { ok: false, status: decision.status, mensaje: decision.mensaje };

  const token = generarSecreto();
  const consulta = "token" in por ? generarSecreto() : null;
  const res = await query(
    `UPDATE ciepi.verificacion_correo
        SET token = $3, reenvios = reenvios + 1, fecha_creacion = $6,
            fecha_expiracion = $4, consulta_hash = COALESCE($5, consulta_hash)
      WHERE id = $1 AND estado = 'pendiente' AND reenvios = $2
      RETURNING fecha_expiracion`,
    [fila.id, fila.reenvios, hashSecreto(token), expiracionDesde(ahora), consulta ? hashSecreto(consulta) : null, ahora]
  );
  if (res.rows.length === 0) {
    return { ok: false, status: 409, mensaje: "La solicitud cambió mientras se reenviaba. Recarga la página." };
  }
  return { ok: true, token, consulta, fila, fecha_expiracion: res.rows[0].fecha_expiracion };
}
