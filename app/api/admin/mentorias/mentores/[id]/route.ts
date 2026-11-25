import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { requireAdmin, parseId } from "@/lib/adminAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { DURACIONES_MENTORIA, validarDisponibilidad, claveFecha } from "@/lib/mentorias";
import { MOTIVO_MENTOR_NO_DISPONIBLE } from "@/lib/estados/mentoriaReserva";
import { respuestaErrorTransicion } from "@/lib/estadosServer";
import {
  aplicarDesactivacionMentor,
  ErrorReservasActivas,
  type ReservaCanceladaPorMentor,
} from "@/lib/mentoriasServer";
import { enviarCancelacionesPorMentor } from "@/lib/mentoriasEmails";

type Params = { params: Promise<{ id: string }> };

/** Configuración completa de un mentor: datos, áreas, horario semanal y bloqueos vigentes. */
export async function GET(_request: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: "Profesor no válido." }, { status: 400 });

  try {
    const prof = await query(
      `SELECT id, nombre, apellido, especialidad, biografia, correo, activo,
              es_mentor, foto, duracion_mentoria_min
       FROM ciepi.profesores WHERE id = $1`,
      [id]
    );
    if (prof.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Profesor no encontrado." }, { status: 404 });
    }
    const [areas, disp, bloqueos] = await Promise.all([
      query(`SELECT area_id FROM ciepi.mentor_areas WHERE profesor_id = $1`, [id]),
      query(
        `SELECT id, dia_semana, to_char(hora_inicio, 'HH24:MI') AS hora_inicio,
                to_char(hora_fin, 'HH24:MI') AS hora_fin, modalidad, sede_id, aula_id,
                to_char(vigente_desde, 'YYYY-MM-DD') AS vigente_desde,
                to_char(vigente_hasta, 'YYYY-MM-DD') AS vigente_hasta
         FROM ciepi.mentor_disponibilidad WHERE profesor_id = $1
         ORDER BY dia_semana, hora_inicio`,
        [id]
      ),
      query(
        `SELECT id, to_char(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
                to_char(fecha_fin, 'YYYY-MM-DD') AS fecha_fin, motivo
         FROM ciepi.mentor_bloqueos
         WHERE profesor_id = $1 AND fecha_fin >= (NOW() AT TIME ZONE 'America/Panama')::date
         ORDER BY fecha_inicio`,
        [id]
      ),
    ]);
    return NextResponse.json({
      success: true,
      data: {
        ...prof.rows[0],
        area_ids: areas.rows.map((r) => r.area_id as number),
        disponibilidad: disp.rows,
        bloqueos: bloqueos.rows,
      },
    });
  } catch (error) {
    console.error("Error al cargar mentor:", error);
    return NextResponse.json({ success: false, error: "Error al cargar el mentor." }, { status: 500 });
  }
}

/**
 * Guarda la configuración de mentor. Áreas y horario se reemplazan completos, en una transacción.
 *
 * Si con es_mentor = false el profesor deja de atender y tiene mentorías confirmadas o
 * pendientes futuras, responde 409 { code: "RESERVAS_ACTIVAS", reservas } sin guardar nada,
 * salvo que llegue `cancelar_reservas: true`: entonces las cancela como cancelada_ciepi
 * (con `motivo_cancelacion` o un motivo por defecto) en la misma transacción y avisa
 * por correo después del commit.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const session = await getServerSession(authOptions);
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: "Profesor no válido." }, { status: 400 });

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Datos no válidos." }, { status: 400 });
  }

  const es_mentor = body.es_mentor === true;
  const duracion = Number(body.duracion_mentoria_min);
  if (!(DURACIONES_MENTORIA as readonly number[]).includes(duracion)) {
    return NextResponse.json({ success: false, error: "Duración de mentoría no válida." }, { status: 400 });
  }
  // Solo se aceptan fotos subidas por /api/upload a la carpeta de mentores.
  const foto =
    typeof body.foto === "string" && body.foto.trim() ? body.foto.trim().slice(0, 500) : null;
  if (foto && !/^\/uploads\/mentores\/[\w.-]+\.(jpg|jpeg|png|webp)$/i.test(foto)) {
    return NextResponse.json({ success: false, error: "Foto no válida." }, { status: 400 });
  }
  const areaIds: number[] = Array.isArray(body.area_ids)
    ? [...new Set(body.area_ids.map(Number).filter((n: number) => Number.isInteger(n) && n > 0))] as number[]
    : [];
  const disp = validarDisponibilidad(body.disponibilidad ?? []);
  if (!disp.ok) return NextResponse.json({ success: false, error: disp.error }, { status: 400 });

  const cancelarReservas = body.cancelar_reservas === true;
  const motivoCancelacion =
    typeof body.motivo_cancelacion === "string" && body.motivo_cancelacion.trim()
      ? body.motivo_cancelacion.trim().slice(0, 500)
      : MOTIVO_MENTOR_NO_DISPONIBLE;

  try {
    const canceladas: ReservaCanceladaPorMentor[] = await withTransaction(async (q) => {
      const upd = await q(
        `UPDATE ciepi.profesores
         SET es_mentor = $1, duracion_mentoria_min = $2, foto = $3, fecha_actualizacion = NOW()
         WHERE id = $4
         RETURNING activo`,
        [es_mentor, duracion, foto, id]
      );
      if (upd.rowCount === 0) throw Object.assign(new Error("Profesor no encontrado."), { status: 404 });

      // Con la fila del profesor ya bloqueada: reservas activas si deja de atender.
      const canceladasTx = await aplicarDesactivacionMentor(q, {
        profesorId: id,
        esMentor: es_mentor,
        activo: Boolean(upd.rows[0].activo),
        cancelarReservas,
        motivo: motivoCancelacion,
        actor: { tipo: "admin", id: session?.user?.adminId ?? null, descripcion: session?.user?.email ?? null },
        rol: session?.user?.rolId,
      });

      if (areaIds.length > 0) {
        const ok = await q(`SELECT COUNT(*)::int AS n FROM ciepi.mentoria_areas WHERE id = ANY($1::int[])`, [areaIds]);
        if (ok.rows[0].n !== areaIds.length) throw Object.assign(new Error("Hay un área que no existe."), { status: 400 });
      }

      // Cada aula elegida debe pertenecer a la sede elegida.
      for (const [i, d] of disp.items.entries()) {
        if (d.aula_id == null) continue;
        const aula = await q(
          `SELECT e.sede_id FROM ciepi.aulas a JOIN ciepi.edificios e ON e.id = a.edificio_id WHERE a.id = $1`,
          [d.aula_id]
        );
        if (aula.rowCount === 0 || (d.sede_id != null && aula.rows[0].sede_id !== d.sede_id)) {
          throw Object.assign(new Error(`Bloque ${i + 1}: el aula no pertenece a la sede elegida.`), { status: 400 });
        }
        if (d.sede_id == null) d.sede_id = aula.rows[0].sede_id;
      }

      await q(`DELETE FROM ciepi.mentor_areas WHERE profesor_id = $1`, [id]);
      if (areaIds.length > 0) {
        await q(
          `INSERT INTO ciepi.mentor_areas (profesor_id, area_id) SELECT $1, unnest($2::int[])`,
          [id, areaIds]
        );
      }

      await q(`DELETE FROM ciepi.mentor_disponibilidad WHERE profesor_id = $1`, [id]);
      for (const d of disp.items) {
        await q(
          `INSERT INTO ciepi.mentor_disponibilidad
             (profesor_id, dia_semana, hora_inicio, hora_fin, modalidad, sede_id, aula_id, vigente_desde, vigente_hasta)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            id,
            d.dia_semana,
            d.hora_inicio,
            d.hora_fin,
            d.modalidad,
            d.sede_id ?? null,
            d.aula_id ?? null,
            d.vigente_desde ? claveFecha(d.vigente_desde) : null,
            d.vigente_hasta ? claveFecha(d.vigente_hasta) : null,
          ]
        );
      }
      return canceladasTx;
    });
    const avisos = canceladas.length ? await enviarCancelacionesPorMentor(canceladas, motivoCancelacion) : [];
    return NextResponse.json({ success: true, canceladas: canceladas.length, avisos });
  } catch (error) {
    if (error instanceof ErrorReservasActivas) {
      return NextResponse.json(error.cuerpo(), { status: 409 });
    }
    const transicion = respuestaErrorTransicion(error);
    if (transicion) return transicion;
    const status = (error as { status?: number }).status;
    if (status) {
      return NextResponse.json({ success: false, error: (error as Error).message }, { status });
    }
    console.error("Error al guardar mentor:", error);
    return NextResponse.json({ success: false, error: "Error al guardar la configuración." }, { status: 500 });
  }
}
