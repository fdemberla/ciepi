import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activo = searchParams.get("activo");

    console.log("🔍 [GET /api/capacitaciones] Params:", { activo });

    let queryText = `
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
        c.sede,
        c.edificio,
        c.salon,
        c.activo,
        c.fecha_creacion,
        c.fecha_actualizacion,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', p.id,
                'nombre', p.nombre,
                'apellido', p.apellido,
                'especialidad', p.especialidad
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
    `;

    const params: unknown[] = [];
    const conditions: string[] = [];

    // Por defecto, solo mostrar capacitaciones con inscripción vigente
    // (fecha_final_inscripcion es NULL o mayor que NOW)
    conditions.push(
      `(fecha_final_inscripcion IS NULL OR fecha_final_inscripcion >= NOW())`
    );

    // Filter by activo if parameter is provided
    if (activo !== null) {
      // Convert string to boolean: "true" or "1" = true, anything else = false
      const isActivo = activo === "true" || activo === "1";
      params.push(isActivo);
      conditions.push(`activo = $${params.length}`);
    }

    // Agregar condiciones al query
    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(" AND ")}`;
    }

    queryText += ` ORDER BY fecha_creacion DESC`;

    console.log("📊 [Query]:", queryText, params);

    const result = await query(queryText, params);

    console.log("✅ [Result]:", result.rows.length, "capacitaciones found");

    return NextResponse.json(
      {
        success: true,
        data: result.rows,
        count: result.rows.length,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ [GET /api/capacitaciones] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener capacitaciones",
        message: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
