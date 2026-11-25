import { NextResponse } from "next/server";
import type { QueryResult } from "pg";
import type { HorarioInput } from "@/lib/capacitacionDetails";

/** Ejecutor de consultas (query de lib/db o el `q` de withTransaction). */
export type Q = (text: string, params?: unknown[]) => Promise<QueryResult>;

/** Referencia no válida (sede/edificio/aula/profesor inexistente o inactivo): se responde 400. */
export class ErrorReferenciaCapacitacion extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ErrorReferenciaCapacitacion";
  }
}

export interface ReferenciasCapacitacion {
  sedeId: number | null;
  edificioId: number | null;
  aulaId: number | null;
  profesorIds: number[];
}

/**
 * Comprueba que la ubicación sea coherente (el edificio pertenece a la sede y el aula
 * al edificio) y que existan los profesores. Los registros INACTIVOS solo se aceptan si
 * ya estaban asignados a la capacitación (`actuales`): no se pueden elegir para una
 * asignación nueva, pero editar una capacitación no los quita.
 */
export async function validarReferenciasCapacitacion(
  q: Q,
  nuevas: ReferenciasCapacitacion,
  actuales?: ReferenciasCapacitacion,
): Promise<void> {
  const { sedeId, edificioId, aulaId, profesorIds } = nuevas;

  if (edificioId && !sedeId) throw new ErrorReferenciaCapacitacion("Selecciona la sede del edificio.");
  if (aulaId && !edificioId) throw new ErrorReferenciaCapacitacion("Selecciona el edificio del aula.");

  if (sedeId) {
    const r = await q(`SELECT activo FROM ciepi.sedes WHERE id = $1`, [sedeId]);
    if (!r.rows[0]) throw new ErrorReferenciaCapacitacion("La sede seleccionada no existe.");
    if (!r.rows[0].activo && actuales?.sedeId !== sedeId) {
      throw new ErrorReferenciaCapacitacion("La sede seleccionada está inactiva.");
    }
  }
  if (edificioId) {
    const r = await q(`SELECT sede_id, activo FROM ciepi.edificios WHERE id = $1`, [edificioId]);
    if (!r.rows[0] || r.rows[0].sede_id !== sedeId) {
      throw new ErrorReferenciaCapacitacion("El edificio seleccionado no pertenece a la sede.");
    }
    if (!r.rows[0].activo && actuales?.edificioId !== edificioId) {
      throw new ErrorReferenciaCapacitacion("El edificio seleccionado está inactivo.");
    }
  }
  if (aulaId) {
    const r = await q(`SELECT edificio_id, activo FROM ciepi.aulas WHERE id = $1`, [aulaId]);
    if (!r.rows[0] || r.rows[0].edificio_id !== edificioId) {
      throw new ErrorReferenciaCapacitacion("El aula seleccionada no pertenece al edificio.");
    }
    if (!r.rows[0].activo && actuales?.aulaId !== aulaId) {
      throw new ErrorReferenciaCapacitacion("El aula seleccionada está inactiva.");
    }
  }

  if (profesorIds.length > 0) {
    const r = await q(
      `SELECT id, activo, nombre, apellido FROM ciepi.profesores WHERE id = ANY($1::int[])`,
      [profesorIds],
    );
    if (r.rows.length !== profesorIds.length) {
      throw new ErrorReferenciaCapacitacion(
        "Uno de los profesores seleccionados ya no existe. Recarga la página.",
      );
    }
    const yaAsignados = new Set(actuales?.profesorIds ?? []);
    const inactivoNuevo = r.rows.find((p) => !p.activo && !yaAsignados.has(p.id));
    if (inactivoNuevo) {
      throw new ErrorReferenciaCapacitacion(
        `El profesor ${inactivoNuevo.nombre} ${inactivoNuevo.apellido} está inactivo y no se puede asignar.`,
      );
    }
  }
}

/**
 * Guarda profesores y bloques horarios de una capacitación (dentro de la transacción).
 * Al reemplazar, solo se quitan los profesores que ya no están en la lista (los que
 * siguen conservan su rol y fecha de asignación) y los horarios se reescriben en una
 * sola sentencia con unnest.
 */
export async function guardarHijosCapacitacion(
  q: Q,
  capacitacionId: number,
  profesorIds: number[],
  horarios: HorarioInput[],
  reemplazar: boolean,
): Promise<void> {
  if (reemplazar) {
    await q(
      `DELETE FROM ciepi.capacitacion_profesores
       WHERE capacitacion_id = $1 AND NOT (profesor_id = ANY($2::int[]))`,
      [capacitacionId, profesorIds],
    );
    await q(`DELETE FROM ciepi.capacitacion_horarios WHERE capacitacion_id = $1`, [capacitacionId]);
  }
  if (profesorIds.length > 0) {
    await q(
      `INSERT INTO ciepi.capacitacion_profesores (capacitacion_id, profesor_id)
       SELECT $1, unnest($2::int[])
       ON CONFLICT DO NOTHING`,
      [capacitacionId, profesorIds],
    );
  }
  if (horarios.length > 0) {
    await q(
      `INSERT INTO ciepi.capacitacion_horarios (capacitacion_id, dia_semana, hora_inicio, hora_fin)
       SELECT $1, d, hi, hf
       FROM unnest($2::smallint[], $3::time[], $4::time[]) AS t(d, hi, hf)`,
      [
        capacitacionId,
        horarios.map((h) => h.dia_semana),
        horarios.map((h) => h.hora_inicio),
        horarios.map((h) => h.hora_fin),
      ],
    );
  }
}

/** Estados de mentoría que todavía ocupan una sede/aula o un mentor. */
export const ESTADOS_RESERVA_ACTIVA = ["pendiente_verificacion", "confirmada"];

export interface DependenciasUbicacion {
  capacitaciones: number;
  disponibilidad: number;
  reservasActivas: number;
}

/**
 * Cuenta lo que depende de una sede, edificio o aula (incluidos sus edificios y aulas
 * hijos, que se borrarían en cascada): capacitaciones, horarios de mentores y
 * reservas de mentoría activas.
 */
export async function dependenciasUbicacion(
  q: Q,
  tipo: "sede" | "edificio" | "aula",
  id: number,
): Promise<DependenciasUbicacion> {
  // Aulas afectadas (las del propio nivel y las de los hijos).
  const aulasSql =
    tipo === "sede"
      ? `SELECT a.id FROM ciepi.aulas a JOIN ciepi.edificios e ON e.id = a.edificio_id WHERE e.sede_id = $1`
      : tipo === "edificio"
        ? `SELECT a.id FROM ciepi.aulas a WHERE a.edificio_id = $1`
        : `SELECT $1::int AS id`;
  const edificiosSql =
    tipo === "sede"
      ? `SELECT e.id FROM ciepi.edificios e WHERE e.sede_id = $1`
      : tipo === "edificio"
        ? `SELECT $1::int AS id`
        : `SELECT NULL::int AS id WHERE false`;
  const sedeCond = tipo === "sede" ? `x.sede_id = $1 OR ` : "";

  const r = await q(
    `SELECT
       (SELECT COUNT(*) FROM ciepi.capacitaciones x
         WHERE ${sedeCond} x.edificio_id IN (${edificiosSql}) OR x.aula_id IN (${aulasSql}))::int AS capacitaciones,
       (SELECT COUNT(*) FROM ciepi.mentor_disponibilidad x
         WHERE ${sedeCond} x.aula_id IN (${aulasSql}))::int AS disponibilidad,
       (SELECT COUNT(*) FROM ciepi.mentoria_reservas x
         WHERE x.estado = ANY($2::text[]) AND (${sedeCond} x.aula_id IN (${aulasSql})))::int AS reservas_activas`,
    [id, ESTADOS_RESERVA_ACTIVA],
  );
  const fila = r.rows[0] ?? {};
  return {
    capacitaciones: Number(fila.capacitaciones ?? 0),
    disponibilidad: Number(fila.disponibilidad ?? 0),
    reservasActivas: Number(fila.reservas_activas ?? 0),
  };
}

/**
 * Borrado protegido de una sede, edificio o aula (dentro de withTransaction).
 * Bloquea la fila (FOR UPDATE: una capacitación nueva que la referencie tiene que
 * esperar), cuenta dependencias y responde 409 si las hay, en vez de dejar
 * capacitaciones y reservas sin lugar por el ON DELETE CASCADE / SET NULL.
 */
export async function respuestaBorradoUbicacion(
  q: Q,
  tipo: "sede" | "edificio" | "aula",
  id: number,
  textos: { tabla: string; noEncontrado: string; eliminado: string; sujeto: string; desactivar: string },
): Promise<NextResponse> {
  const fila = await q(`SELECT id FROM ${textos.tabla} WHERE id = $1 FOR UPDATE`, [id]);
  if (fila.rows.length === 0) {
    return NextResponse.json({ success: false, error: textos.noEncontrado }, { status: 404 });
  }
  const dep = await dependenciasUbicacion(q, tipo, id);
  const detalle = describirDependencias([
    [dep.capacitaciones, "capacitación", "capacitaciones"],
    [dep.reservasActivas, "reserva de mentoría activa", "reservas de mentoría activas"],
    [dep.disponibilidad, "horario de mentor", "horarios de mentores"],
  ]);
  if (detalle) {
    return NextResponse.json(
      {
        success: false,
        error: `${textos.sujeto} está en uso por ${detalle}. No se puede eliminar sin dejarlas sin ubicación. ${textos.desactivar}`,
        dependencias: dep,
        sugerencia: "desactivar",
      },
      { status: 409 },
    );
  }
  await q(`DELETE FROM ${textos.tabla} WHERE id = $1`, [id]);
  return NextResponse.json({ success: true, message: textos.eliminado });
}

/** 23503 (violación de FK) → 409 con un mensaje claro; null si es otro error. */
export function respuestaErrorFk(error: unknown, mensaje: string): NextResponse | null {
  if ((error as { code?: string })?.code === "23503") {
    return NextResponse.json({ success: false, error: mensaje }, { status: 409 });
  }
  return null;
}

/** Texto para el 409: «2 capacitaciones y 1 reserva de mentoría activa». */
export function describirDependencias(partes: Array<[number, string, string]>): string {
  const textos = partes
    .filter(([n]) => n > 0)
    .map(([n, singular, plural]) => `${n} ${n === 1 ? singular : plural}`);
  if (textos.length <= 1) return textos.join("");
  return `${textos.slice(0, -1).join(", ")} y ${textos[textos.length - 1]}`;
}
