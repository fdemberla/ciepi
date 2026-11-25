import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { parseId } from "@/lib/adminAuth";
import { ventanaInscripcionSql } from "@/lib/inscripcionVentana";

/**
 * Detalle público de una capacitación.
 * - 404 si no existe o está inactiva (el admin usa /api/admin/capacitaciones/[id]).
 * - `inscripcion_abierta` se calcula en el servidor con la ventana de inscripción
 *   (último día incluido, hora de Panamá); `inscripcion_estado` dice por qué no:
 *   "proximamente" (aún no abre) o "cerrada" (ya cerró).
 */

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string = "";
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;
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
        c.sede_id,
        c.edificio_id,
        c.aula_id,
        c.activo,
        ${ventanaInscripcionSql("c")},
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
                'biografia', p.biografia
              )
              ORDER BY p.apellido, p.nombre
            )
            FROM ciepi.capacitacion_profesores cp
            JOIN ciepi.profesores p ON p.id = cp.profesor_id
            WHERE cp.capacitacion_id = c.id AND p.activo = true
          ),
          '[]'::json
        ) AS profesores
      FROM ciepi.capacitaciones c
      LEFT JOIN ciepi.sedes s ON s.id = c.sede_id
      LEFT JOIN ciepi.edificios e ON e.id = c.edificio_id
      LEFT JOIN ciepi.aulas a ON a.id = c.aula_id
      WHERE c.id = $1 AND c.activo = true
    `;

    const result = await query(queryText, [capacitacionId]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Capacitación no encontrada" },
        { status: 404 }
      );
    }

    const { inscripcion_iniciada, inscripcion_vigente, ...fila } = result.rows[0];
    const inscripcion_estado = !inscripcion_iniciada
      ? "proximamente"
      : !inscripcion_vigente
        ? "cerrada"
        : "abierta";

    return NextResponse.json(
      {
        success: true,
        data: {
          ...fila,
          inscripcion_abierta: inscripcion_estado === "abierta",
          inscripcion_estado,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`❌ [GET /api/capacitaciones/${id}] Error:`, error);

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
