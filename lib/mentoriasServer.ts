/**
 * Acceso a datos del módulo de mentorías (solo servidor).
 * Lo comparten la vista previa del admin, la API pública y la reserva.
 */
import type { QueryResult } from "pg";
import { query } from "@/lib/db";
import { generarTurnos, ANTICIPACION_RESERVA_HORAS, type Turno } from "@/lib/mentorias";
import { cambiarEstado, ErrorTransicion, type Actor } from "@/lib/estadosServer";
import {
  validarTransicionReserva,
  decidirDesactivacionMentor,
  type ActorReserva,
  type EstadoReserva,
} from "@/lib/estados/mentoriaReserva";

type Q = (text: string, params?: unknown[]) => Promise<QueryResult>;

/** Tabla de reservas (constante del código, para cambiarEstado). */
export const TABLA_RESERVAS = "ciepi.mentoria_reservas";

export interface TurnoPublico extends Turno {
  sede_nombre: string | null;
  aula_nombre: string | null;
}

/**
 * Condición SQL de "el mentor puede atender esta reserva" (alias r = reserva, p = profesor):
 * activo, marcado como mentor y sin un bloqueo (vacaciones, licencia) en la fecha de Panamá de la sesión.
 */
export const SQL_MENTOR_DISPONIBLE = `(p.activo AND p.es_mentor AND NOT EXISTS (
  SELECT 1 FROM ciepi.mentor_bloqueos b
   WHERE b.profesor_id = p.id
     AND (r.inicio AT TIME ZONE 'America/Panama')::date BETWEEN b.fecha_inicio AND b.fecha_fin))`;

/** Condición SQL de "reserva que ocupa el horario": confirmada, o pendiente aún vigente. */
export const SQL_RESERVA_OCUPA = `(r.estado = 'confirmada' OR (r.estado = 'pendiente_verificacion' AND r.pendiente_expira > NOW()))`;

/** Turnos libres de un mentor para los próximos `dias` días. */
export async function cargarTurnosMentor(
  profesorId: number,
  dias: number,
  q: Q = query
): Promise<{ turnos: TurnoPublico[]; duracion: number } | null> {
  const prof = await q(`SELECT duracion_mentoria_min FROM ciepi.profesores WHERE id = $1`, [profesorId]);
  if (prof.rowCount === 0) return null;
  const duracion = prof.rows[0].duracion_mentoria_min as number;

  const [disp, bloqueos, ocupados, lugares] = await Promise.all([
    q(
      `SELECT id, dia_semana, to_char(hora_inicio, 'HH24:MI') AS hora_inicio, to_char(hora_fin, 'HH24:MI') AS hora_fin,
              modalidad, sede_id, aula_id,
              to_char(vigente_desde, 'YYYY-MM-DD') AS vigente_desde, to_char(vigente_hasta, 'YYYY-MM-DD') AS vigente_hasta
       FROM ciepi.mentor_disponibilidad WHERE profesor_id = $1`,
      [profesorId]
    ),
    q(
      `SELECT to_char(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio, to_char(fecha_fin, 'YYYY-MM-DD') AS fecha_fin
       FROM ciepi.mentor_bloqueos WHERE profesor_id = $1`,
      [profesorId]
    ),
    q(
      `SELECT r.inicio, r.fin FROM ciepi.mentoria_reservas r
       WHERE r.profesor_id = $1 AND r.fin > NOW() AND ${SQL_RESERVA_OCUPA}`,
      [profesorId]
    ),
    q(
      `SELECT d.id, s.nombre AS sede_nombre, a.nombre AS aula_nombre
       FROM ciepi.mentor_disponibilidad d
       LEFT JOIN ciepi.sedes s ON s.id = d.sede_id
       LEFT JOIN ciepi.aulas a ON a.id = d.aula_id
       WHERE d.profesor_id = $1`,
      [profesorId]
    ),
  ]);

  const nombres = new Map(lugares.rows.map((r) => [r.id as number, r]));
  const turnos = generarTurnos({
    disponibilidad: disp.rows,
    bloqueos: bloqueos.rows,
    ocupados: ocupados.rows,
    duracionMin: duracion,
    ahora: new Date(),
    dias,
    anticipacionHoras: ANTICIPACION_RESERVA_HORAS,
  }).map((t) => {
    const lugar = t.modalidad === "presencial" && t.disponibilidad_id ? nombres.get(t.disponibilidad_id) : null;
    return { ...t, sede_nombre: lugar?.sede_nombre ?? null, aula_nombre: lugar?.aula_nombre ?? null };
  });
  return { turnos, duracion };
}

export interface MentorPublico {
  id: number;
  nombre: string;
  apellido: string;
  especialidad: string | null;
  biografia: string | null;
  foto: string | null;
  duracion_mentoria_min: number;
  areas: { id: number; nombre: string }[];
  modalidades: string[];
}

/** Mentores visibles al público (activos y marcados como mentores). Sin datos de contacto. */
export async function listarMentoresPublicos(id?: number): Promise<MentorPublico[]> {
  const result = await query(
    `SELECT p.id, p.nombre, p.apellido, p.especialidad, p.biografia, p.foto, p.duracion_mentoria_min,
            COALESCE(
              (SELECT json_agg(json_build_object('id', a.id, 'nombre', a.nombre) ORDER BY a.nombre)
               FROM ciepi.mentor_areas ma JOIN ciepi.mentoria_areas a ON a.id = ma.area_id
               WHERE ma.profesor_id = p.id AND a.activo = true),
              '[]'::json
            ) AS areas,
            COALESCE(
              (SELECT json_agg(DISTINCT d.modalidad) FROM ciepi.mentor_disponibilidad d WHERE d.profesor_id = p.id),
              '[]'::json
            ) AS modalidades
     FROM ciepi.profesores p
     WHERE p.es_mentor = true AND p.activo = true AND ($1::int IS NULL OR p.id = $1)
     ORDER BY p.apellido, p.nombre`,
    [id ?? null]
  );
  return result.rows as MentorPublico[];
}

/** Datos de una reserva para correos y la página de gestión. */
export async function cargarReservaCompleta(where: { id?: number; tokenHash?: string }, q: Q = query) {
  const result = await q(
    `SELECT r.*, p.nombre AS mentor_nombre, p.apellido AS mentor_apellido, p.correo AS mentor_correo,
            ${SQL_MENTOR_DISPONIBLE} AS mentor_activo,
            a.nombre AS area_nombre, s.nombre AS sede_nombre, au.nombre AS aula_nombre
     FROM ciepi.mentoria_reservas r
     JOIN ciepi.profesores p ON p.id = r.profesor_id
     LEFT JOIN ciepi.mentoria_areas a ON a.id = r.area_id
     LEFT JOIN ciepi.sedes s ON s.id = r.sede_id
     LEFT JOIN ciepi.aulas au ON au.id = r.aula_id
     WHERE ($1::int IS NOT NULL AND r.id = $1) OR ($2::text IS NOT NULL AND r.token_gestion_hash = $2)`,
    [where.id ?? null, where.tokenHash ?? null]
  );
  return (result.rows[0] as ReservaCompleta | undefined) ?? null;
}

export interface ReservaCompleta {
  id: number;
  profesor_id: number;
  inicio: Date;
  fin: Date;
  modalidad: "presencial" | "virtual";
  nombre: string;
  correo: string;
  telefono: string | null;
  tema: string | null;
  estado: string;
  pendiente_expira: Date | null;
  enlace_reunion: string | null;
  mentor_nombre: string;
  mentor_apellido: string;
  mentor_correo: string | null;
  mentor_activo: boolean;
  area_nombre: string | null;
  sede_nombre: string | null;
  aula_nombre: string | null;
}

export function lugarReserva(r: Pick<ReservaCompleta, "modalidad" | "sede_nombre" | "aula_nombre">): string {
  if (r.modalidad === "virtual") return "Virtual (el enlace de la reunión se enviará por correo)";
  return [r.sede_nombre, r.aula_nombre].filter(Boolean).join(", ") || "Presencial (CIEPI confirmará el lugar)";
}

// ---------------------------------------------------------------- cambios de estado

/** Fila de la reserva bloqueada para un cambio de estado (con la hora de la BD). */
export interface ReservaBloqueada {
  id: number;
  profesor_id: number;
  estado: EstadoReserva;
  inicio: Date;
  fin: Date;
  pendiente_expira: Date | null;
  modalidad: "presencial" | "virtual";
  /** Mentor activo y sin bloqueo en la fecha de la sesión (SQL_MENTOR_DISPONIBLE). */
  mentor_activo: boolean;
  /** NOW() de la transacción: todas las reglas de tiempo usan la hora de la BD. */
  ahora: Date;
}

/**
 * Bloquea la reserva dentro de una transacción. Primero el mentor (FOR SHARE) y
 * después la reserva (FOR UPDATE): el mismo orden que usa la desactivación del
 * mentor, así no hay interbloqueos y una confirmación no puede colarse mientras
 * se desactiva al mentor.
 */
export async function bloquearReserva(q: Q, id: number): Promise<ReservaBloqueada | null> {
  const prof = await q(
    `SELECT ${SQL_MENTOR_DISPONIBLE} AS mentor_activo
       FROM ciepi.mentoria_reservas r
       JOIN ciepi.profesores p ON p.id = r.profesor_id
      WHERE r.id = $1
      FOR SHARE OF p`,
    [id]
  );
  if (prof.rowCount === 0) return null;
  const r = await q(
    `SELECT id, profesor_id, estado, inicio, fin, pendiente_expira, modalidad, NOW() AS ahora
       FROM ciepi.mentoria_reservas WHERE id = $1 FOR UPDATE`,
    [id]
  );
  if (r.rowCount === 0) return null;
  return { ...r.rows[0], mentor_activo: Boolean(prof.rows[0].mentor_activo) } as ReservaBloqueada;
}

/** Columnas de fecha que acompañan a cada estado de destino. */
function columnasExtra(a: EstadoReserva, ahora: Date): Record<string, unknown> {
  const extra: Record<string, unknown> = { fecha_actualizacion: ahora };
  if (a === "confirmada") extra.confirmada_en = ahora;
  if (a === "cancelada_usuario" || a === "cancelada_ciepi") extra.cancelada_en = ahora;
  return extra;
}

/**
 * Valida con la máquina de estados (lib/estados/mentoriaReserva.ts) y aplica el
 * cambio con cambiarEstado (UPDATE condicionado + historial). Lanza ErrorTransicion.
 */
export async function transicionarReserva(
  q: Q,
  o: {
    reserva: Pick<ReservaBloqueada, "id" | "estado" | "inicio" | "pendiente_expira" | "mentor_activo" | "ahora">;
    a: string;
    actor: Actor & { tipo: ActorReserva };
    rol?: number;
    motivo?: string | null;
    ip?: string | null;
    extra?: Record<string, unknown>;
  }
): Promise<Record<string, unknown>> {
  const v = validarTransicionReserva(o.reserva, o.a, {
    actor: o.actor.tipo,
    ahora: new Date(o.reserva.ahora),
    rol: o.rol,
    mentorActivo: o.reserva.mentor_activo,
    motivo: o.motivo,
  });
  if (!v.ok) {
    throw new ErrorTransicion(v.status, v.motivo, v.status === 410 ? "PLAZO_VENCIDO" : "TRANSICION_INVALIDA");
  }
  return cambiarEstado(q, {
    entidad: "mentoria_reserva",
    tabla: TABLA_RESERVAS,
    columnaEstado: "estado",
    id: o.reserva.id,
    de: o.reserva.estado,
    a: v.transicion.a,
    accion: v.transicion.accion,
    actor: o.actor,
    motivo: o.motivo ?? null,
    override: v.transicion.override,
    extra: { ...columnasExtra(v.transicion.a, new Date(o.reserva.ahora)), ...(o.extra ?? {}) },
    ip: o.ip ?? null,
  });
}

/**
 * Marca como expiradas las pendientes cuyo plazo venció (todas, o solo las de un
 * mentor) y deja una entrada de historial por cada una, en la misma sentencia.
 * Devuelve cuántas expiró.
 */
export async function expirarPendientesVencidas(
  q: Q,
  o: { profesorId?: number | null; actorDescripcion: string }
): Promise<number> {
  const res = await q(
    `WITH exp AS (
       UPDATE ciepi.mentoria_reservas SET estado = 'expirada', fecha_actualizacion = NOW()
        WHERE estado = 'pendiente_verificacion' AND pendiente_expira <= NOW()
          AND ($1::int IS NULL OR profesor_id = $1)
        RETURNING id
     )
     INSERT INTO ciepi.estado_historial
       (entidad, entidad_id, estado_de, estado_a, accion, actor_tipo, actor_descripcion, motivo)
     SELECT 'mentoria_reserva', id::text, 'pendiente_verificacion', 'expirada', 'expirar', 'sistema', $2,
            'No se confirmó a tiempo.'
       FROM exp`,
    [o.profesorId ?? null, o.actorDescripcion]
  );
  return res.rowCount ?? 0;
}

// ---------------------------------------------------------------- desactivar mentor

export interface ReservaActivaMentor {
  id: number;
  estado: EstadoReserva;
  inicio: Date;
  pendiente_expira: Date | null;
  nombre: string;
}

/** Error 409 al desactivar un mentor que tiene reservas activas futuras. */
export class ErrorReservasActivas extends Error {
  status = 409;
  code = "RESERVAS_ACTIVAS";
  constructor(public reservas: ReservaActivaMentor[]) {
    super(
      `Este mentor tiene ${reservas.length} mentoría${reservas.length === 1 ? "" : "s"} confirmada${
        reservas.length === 1 ? "" : "s"
      } o pendiente${reservas.length === 1 ? "" : "s"}. Cancélala${
        reservas.length === 1 ? "" : "s"
      } (se avisará a cada persona) antes de desactivarlo.`
    );
  }

  /** Cuerpo JSON de la respuesta 409 (sin correo ni teléfono). */
  cuerpo() {
    return {
      success: false,
      error: this.message,
      code: this.code,
      reservas: this.reservas.map((r) => ({
        id: r.id,
        estado: r.estado,
        inicio: new Date(r.inicio).toISOString(),
        nombre: r.nombre,
      })),
    };
  }
}

/** Reserva cancelada por desactivar al mentor (para enviar los correos después del commit). */
export interface ReservaCanceladaPorMentor {
  id: number;
  estadoPrevio: EstadoReserva;
}

/**
 * Se llama dentro de la transacción, DESPUÉS de actualizar ciepi.profesores (así la
 * fila del profesor ya está bloqueada y no entran reservas ni confirmaciones nuevas).
 * Si el profesor deja de atender como mentor y tiene reservas activas futuras:
 * - sin cancelarReservas → lanza ErrorReservasActivas (409) y la transacción se revierte;
 * - con cancelarReservas → las pasa a cancelada_ciepi con motivo e historial.
 */
export async function aplicarDesactivacionMentor(
  q: Q,
  o: {
    profesorId: number;
    esMentor: boolean;
    activo: boolean;
    cancelarReservas: boolean;
    motivo: string;
    actor: Actor & { tipo: "admin" };
    rol?: number;
  }
): Promise<ReservaCanceladaPorMentor[]> {
  if (o.esMentor && o.activo) return [];
  const res = await q(
    `SELECT id, estado, inicio, pendiente_expira, nombre, NOW() AS ahora
       FROM ciepi.mentoria_reservas
      WHERE profesor_id = $1 AND estado IN ('pendiente_verificacion', 'confirmada') AND inicio > NOW()
      ORDER BY inicio
      FOR UPDATE`,
    [o.profesorId]
  );
  if (res.rowCount === 0) return [];
  const ahora = new Date(res.rows[0].ahora);
  const decision = decidirDesactivacionMentor({
    esMentor: o.esMentor,
    activo: o.activo,
    reservas: res.rows as (ReservaActivaMentor & { ahora: Date })[],
    cancelarReservas: o.cancelarReservas,
    ahora,
  });
  if (decision.tipo === "continuar") return [];
  if (decision.tipo === "bloquear") throw new ErrorReservasActivas(decision.reservas);

  const canceladas: ReservaCanceladaPorMentor[] = [];
  for (const r of decision.reservas) {
    await transicionarReserva(q, {
      reserva: {
        id: r.id,
        estado: r.estado,
        inicio: r.inicio,
        pendiente_expira: r.pendiente_expira,
        mentor_activo: false,
        ahora,
      },
      a: "cancelada_ciepi",
      actor: o.actor,
      rol: o.rol,
      motivo: o.motivo,
    });
    canceladas.push({ id: r.id, estadoPrevio: r.estado });
  }
  return canceladas;
}