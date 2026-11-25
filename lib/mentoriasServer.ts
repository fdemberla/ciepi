/**
 * Acceso a datos del módulo de mentorías (solo servidor).
 * Lo comparten la vista previa del admin, la API pública y la reserva.
 */
import type { QueryResult } from "pg";
import { query } from "@/lib/db";
import { generarTurnos, ANTICIPACION_RESERVA_HORAS, type Turno } from "@/lib/mentorias";

type Q = (text: string, params?: unknown[]) => Promise<QueryResult>;

export interface TurnoPublico extends Turno {
  sede_nombre: string | null;
  aula_nombre: string | null;
}

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
  area_nombre: string | null;
  sede_nombre: string | null;
  aula_nombre: string | null;
}

export function lugarReserva(r: Pick<ReservaCompleta, "modalidad" | "sede_nombre" | "aula_nombre">): string {
  if (r.modalidad === "virtual") return "Virtual (el enlace de la reunión se enviará por correo)";
  return [r.sede_nombre, r.aula_nombre].filter(Boolean).join(", ") || "Presencial (CIEPI confirmará el lugar)";
}
