import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string = "";
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;

    console.log(`🔍 [GET /api/capacitaciones/${id}] Fetching capacitacion`);

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
      WHERE c.id = $1
    `;

    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      console.log(`❌ Capacitacion ${id} not found`);
      return NextResponse.json(
        { success: false, error: "Capacitación no encontrada" },
        { status: 404 }
      );
    }

    console.log(`✅ Capacitacion ${id} found:`, result.rows[0].nombre);

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
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
