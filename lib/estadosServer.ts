import { NextResponse } from "next/server";
import type { QueryResult } from "pg";

/**
 * Escritura común de cambios de estado (servidor).
 *
 * Toda ruta que cambie el estado de una entidad debe pasar por `cambiarEstado`, dentro
 * de `withTransaction`:
 *   1. UPDATE condicionado al estado leído (WHERE estado = $de): si otra persona lo
 *      cambió entretanto, no actualiza nada y se lanza ErrorTransicion 409.
 *   2. INSERT en ciepi.estado_historial (quién, de qué estado a cuál, acción, motivo).
 * Los correos u otros efectos se envían DESPUÉS del commit.
 */

export type Q = (text: string, params?: unknown[]) => Promise<QueryResult>;

export type EntidadHistorial =
  | "inscripcion"
  | "blog"
  | "consulta"
  | "mentoria_reserva"
  | "newsletter_suscriptor";

export interface Actor {
  tipo: "admin" | "ciudadano" | "sistema";
  /** id de ciepi.usuarios_administradores para admins; null para ciudadano/sistema. */
  id?: number | null;
  /** Texto libre (correo, "cron", etc.). */
  descripcion?: string | null;
}

export class ErrorTransicion extends Error {
  constructor(
    public status: number,
    message: string,
    public code = "TRANSICION_INVALIDA"
  ) {
    super(message);
  }
}

/** Respuesta JSON para un ErrorTransicion (o null si es otro error). */
export function respuestaErrorTransicion(error: unknown): NextResponse | null {
  if (error instanceof ErrorTransicion) {
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status: error.status }
    );
  }
  return null;
}

export interface CambioEstado<E extends string | number> {
  entidad: EntidadHistorial;
  /** Tabla con esquema, p. ej. "ciepi.inscripciones" (constante del código, nunca del usuario). */
  tabla: string;
  columnaEstado: string;
  /** Columna de la clave primaria (por defecto "id"). */
  columnaId?: string;
  id: number | string;
  de: E;
  a: E;
  accion: string;
  actor: Actor;
  motivo?: string | null;
  override?: boolean;
  /** Columnas adicionales a fijar en el mismo UPDATE (nombres constantes del código). */
  extra?: Record<string, unknown>;
  ip?: string | null;
}

const IDENT = /^[a-z_][a-z0-9_]*(\.[a-z_][a-z0-9_]*)?$/;

/**
 * UPDATE condicionado + historial. Devuelve la fila actualizada.
 * Lanza ErrorTransicion(409) si el estado ya no era `de`.
 */
export async function cambiarEstado<E extends string | number>(
  q: Q,
  c: CambioEstado<E>
): Promise<Record<string, unknown>> {
  const columnaId = c.columnaId ?? "id";
  for (const ident of [c.tabla, c.columnaEstado, columnaId, ...Object.keys(c.extra ?? {})]) {
    if (!IDENT.test(ident)) throw new Error(`Identificador SQL no permitido: ${ident}`);
  }

  const params: unknown[] = [c.a, c.id, c.de];
  const sets = [`${c.columnaEstado} = $1`];
  for (const [col, val] of Object.entries(c.extra ?? {})) {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  }

  const res = await q(
    `UPDATE ${c.tabla} SET ${sets.join(", ")}
      WHERE ${columnaId} = $2 AND ${c.columnaEstado} = $3
      RETURNING *`,
    params
  );
  if (res.rows.length === 0) {
    const existe = await q(`SELECT 1 FROM ${c.tabla} WHERE ${columnaId} = $1`, [c.id]);
    if (existe.rows.length === 0) throw new ErrorTransicion(404, "Registro no encontrado.", "NO_ENCONTRADO");
    throw new ErrorTransicion(
      409,
      "El estado cambió mientras lo editabas. Recarga la página para ver el estado actual.",
      "CONFLICTO_ESTADO"
    );
  }

  await registrarHistorial(q, {
    entidad: c.entidad,
    entidadId: c.id,
    de: c.de,
    a: c.a,
    accion: c.accion,
    actor: c.actor,
    motivo: c.motivo,
    override: c.override,
    ip: c.ip,
  });
  return res.rows[0];
}

/** Inserta una entrada en el historial (también para creaciones, con de = null). */
export async function registrarHistorial(
  q: Q,
  h: {
    entidad: EntidadHistorial;
    entidadId: number | string;
    de: string | number | null;
    a: string | number;
    accion: string;
    actor: Actor;
    motivo?: string | null;
    override?: boolean;
    ip?: string | null;
  }
): Promise<void> {
  await q(
    `INSERT INTO ciepi.estado_historial
       (entidad, entidad_id, estado_de, estado_a, accion, actor_tipo, actor_id, actor_descripcion,
        motivo, es_override, ip)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      h.entidad,
      String(h.entidadId),
      h.de === null ? null : String(h.de),
      String(h.a),
      h.accion,
      h.actor.tipo,
      h.actor.id ?? null,
      h.actor.descripcion ?? null,
      h.motivo?.trim() || null,
      Boolean(h.override),
      h.ip ?? null,
    ]
  );
}

/** Historial de una entidad, del más reciente al más antiguo (para la UI de admin). */
export async function leerHistorial(q: Q, entidad: EntidadHistorial, entidadId: number | string) {
  const res = await q(
    `SELECT h.id, h.estado_de, h.estado_a, h.accion, h.actor_tipo, h.actor_id,
            COALESCE(NULLIF(TRIM(CONCAT(u.nombre, ' ', u.apellido)), ''), h.actor_descripcion) AS actor_nombre,
            h.motivo, h.es_override, h.creado_en
       FROM ciepi.estado_historial h
       LEFT JOIN ciepi.usuarios_administradores u ON h.actor_tipo = 'admin' AND u.id = h.actor_id
      WHERE h.entidad = $1 AND h.entidad_id = $2
      ORDER BY h.creado_en DESC, h.id DESC`,
    [entidad, String(entidadId)]
  );
  return res.rows;
}
