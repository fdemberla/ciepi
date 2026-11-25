import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { parseId, requireAdmin, requireArea } from "@/lib/adminAuth";
import {
  parseCapacitacionBaseFields,
  parseCapacitacionExtraFields,
} from "@/lib/capacitacionDetails";
import {
  ArchivoNoValidoError,
  deleteSavedFile,
  saveFile,
  validarArchivoParaCarpeta,
} from "@/lib/fileUpload";
import {
  ErrorReferenciaCapacitacion,
  guardarHijosCapacitacion,
  validarReferenciasCapacitacion,
} from "@/lib/capacitacionesServer";

/**
 * Detalle para el admin (incluye capacitaciones inactivas y profesores inactivos
 * asignados, marcados con `activo`). La página de edición carga desde aquí.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string = "";
  try {
    const noAutorizado = await requireAdmin();
    if (noAutorizado) return noAutorizado;

    id = (await params).id;
    const capacitacionId = parseId(id);
    if (!capacitacionId) {
      return NextResponse.json(
        { success: false, error: "Capacitación no encontrada" },
        { status: 404 }
      );
    }

    const queryText = `
      SELECT 
        c.id,
        c.banner,
        c.nombre,
        c.descripcion,
        c.cantidad_horas,
        c.cantidad_participantes,
        c.archivo_adjunto,
        c.fecha_inicio_inscripcion,
        c.fecha_final_inscripcion,
        c.fecha_inicio_capacitacion,
        c.fecha_final_capacitacion,
        c.horario,
        c.modalidad,
        COALESCE(s.nombre, c.sede) AS sede,
        COALESCE(e.nombre, c.edificio) AS edificio,
        COALESCE(a.nombre, c.salon) AS salon,
        c.sede AS sede_texto,
        c.edificio AS edificio_texto,
        c.salon AS salon_texto,
        c.sede_id,
        c.edificio_id,
        c.aula_id,
        c.activo,
        c.fecha_creacion,
        c.fecha_actualizacion,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'dia_semana', ch.dia_semana,
                'hora_inicio', to_char(ch.hora_inicio, 'HH24:MI'),
                'hora_fin', to_char(ch.hora_fin, 'HH24:MI')
              )
              ORDER BY ch.dia_semana, ch.hora_inicio
            )
            FROM ciepi.capacitacion_horarios ch
            WHERE ch.capacitacion_id = c.id
          ),
          '[]'::json
        ) AS horarios,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', p.id,
                'nombre', p.nombre,
                'apellido', p.apellido,
                'especialidad', p.especialidad,
                'biografia', p.biografia,
                'activo', p.activo
              )
              ORDER BY p.apellido, p.nombre
            )
            FROM ciepi.capacitacion_profesores cp
            JOIN ciepi.profesores p ON p.id = cp.profesor_id
            WHERE cp.capacitacion_id = c.id
          ),
          '[]'::json
        ) AS profesores
      FROM ciepi.capacitaciones c
      LEFT JOIN ciepi.sedes s ON s.id = c.sede_id
      LEFT JOIN ciepi.edificios e ON e.id = c.edificio_id
      LEFT JOIN ciepi.aulas a ON a.id = c.aula_id
      WHERE c.id = $1
    `;

    const result = await query(queryText, [capacitacionId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Capacitación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`❌ [GET /api/admin/capacitaciones/${id}] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener capacitación",
        message: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string = "";
  const archivosGuardados: string[] = [];
  try {
    const auth = await requireArea("capacitaciones");
    if (!auth.ok) return auth.respuesta;

    id = (await params).id;
    const capacitacionId = parseId(id);
    if (!capacitacionId) {
      return NextResponse.json(
        { success: false, error: "Capacitación no encontrada" },
        { status: 404 }
      );
    }

    const formData = await request.formData();

    // 1. Validar TODO antes de escribir (misma validación que crear).
    const base = parseCapacitacionBaseFields(formData);
    if (!base.ok) {
      return NextResponse.json({ success: false, error: base.error }, { status: 400 });
    }
    const extra = parseCapacitacionExtraFields(formData);
    if (!extra.ok) {
      return NextResponse.json({ success: false, error: extra.error }, { status: 400 });
    }

    const bannerFile = formData.get("Banner");
    const archivoAdjuntoFile = formData.get("archivoAdjunto");
    const banner = bannerFile instanceof File && bannerFile.size > 0 ? bannerFile : null;
    const adjunto =
      archivoAdjuntoFile instanceof File && archivoAdjuntoFile.size > 0 ? archivoAdjuntoFile : null;
    if (banner) await validarArchivoParaCarpeta(banner, "banners");
    if (adjunto) await validarArchivoParaCarpeta(adjunto, "attachments");

    // `activo` solo cambia si llega en la petición (antes se reactivaba por defecto).
    const activoStr = formData.get("activo");
    const activo =
      typeof activoStr === "string" && activoStr
        ? activoStr === "true" || activoStr === "1"
        : null;

    const d = { ...base.data, ...extra.data };

    // 2. Archivos nuevos (si la transacción falla se borran).
    const bannerNuevo = banner ? await saveFile(banner, "banners") : null;
    if (bannerNuevo) archivosGuardados.push(bannerNuevo);
    const adjuntoNuevo = adjunto ? await saveFile(adjunto, "attachments") : null;
    if (adjuntoNuevo) archivosGuardados.push(adjuntoNuevo);

    // 3. Todo en una transacción: si falla un profesor u horario no queda la
    //    capacitación modificada a medias ni sin profesores/horarios.
    const actualizada = await withTransaction(async (q) => {
      const existente = await q(
        `SELECT c.horario, c.sede, c.edificio, c.salon, c.sede_id, c.edificio_id, c.aula_id,
                COALESCE(
                  (SELECT array_agg(cp.profesor_id) FROM ciepi.capacitacion_profesores cp
                   WHERE cp.capacitacion_id = c.id),
                  '{}'::int[]
                ) AS profesor_ids
         FROM ciepi.capacitaciones c
         WHERE c.id = $1
         FOR UPDATE`,
        [capacitacionId]
      );
      const actual = existente.rows[0];
      if (!actual) return null;

      await validarReferenciasCapacitacion(
        q,
        { sedeId: d.sedeId, edificioId: d.edificioId, aulaId: d.aulaId, profesorIds: d.profesorIds },
        {
          sedeId: actual.sede_id,
          edificioId: actual.edificio_id,
          aulaId: actual.aula_id,
          profesorIds: (actual.profesor_ids as number[]) ?? [],
        }
      );

      // Textos antiguos (anteriores a sede_id/edificio_id/aula_id y a los bloques
      // horarios): solo se reemplazan si llegan en el formulario. Antes se ponían
      // en NULL al guardar y la capacitación perdía su ubicación.
      const legado = (campo: "horario" | "sede" | "edificio" | "salon") =>
        formData.has(campo) ? d[campo] : actual[campo];

      const result = await q(
        `UPDATE ciepi.capacitaciones
         SET banner = COALESCE($1, banner),
             nombre = $2,
             descripcion = $3,
             cantidad_horas = $4,
             cantidad_participantes = $5,
             archivo_adjunto = COALESCE($6, archivo_adjunto),
             fecha_inicio_inscripcion = $7,
             fecha_final_inscripcion = $8,
             fecha_inicio_capacitacion = $9,
             fecha_final_capacitacion = $10,
             horario = $11,
             modalidad = $12,
             sede = $13,
             edificio = $14,
             salon = $15,
             sede_id = $16,
             edificio_id = $17,
             aula_id = $18,
             activo = COALESCE($19, activo),
             fecha_actualizacion = NOW()
         WHERE id = $20
         RETURNING *`,
        [
          bannerNuevo,
          d.nombre,
          d.descripcion ? JSON.stringify(d.descripcion) : null,
          d.cantidadHoras,
          d.cantidadParticipantes,
          adjuntoNuevo,
          d.fechaInicioInscripcion,
          d.fechaFinalInscripcion,
          d.fechaInicioCapacitacion,
          d.fechaFinalCapacitacion,
          legado("horario"),
          d.modalidad,
          legado("sede"),
          legado("edificio"),
          legado("salon"),
          d.sedeId,
          d.edificioId,
          d.aulaId,
          activo,
          capacitacionId,
        ]
      );

      await guardarHijosCapacitacion(q, capacitacionId, d.profesorIds, d.horarios, true);
      return result.rows[0];
    });

    if (!actualizada) {
      await Promise.all(archivosGuardados.map(deleteSavedFile));
      return NextResponse.json(
        { success: false, error: "Capacitación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Capacitación actualizada exitosamente",
        data: actualizada,
      },
      { status: 200 }
    );
  } catch (error) {
    await Promise.all(archivosGuardados.map(deleteSavedFile));
    if (error instanceof ArchivoNoValidoError || error instanceof ErrorReferenciaCapacitacion) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error(`[PUT /api/admin/capacitaciones/${id}] Error:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar capacitación",
        message: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
