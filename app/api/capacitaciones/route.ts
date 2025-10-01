import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const activo = searchParams.get("activo");

    console.log("🔍 [GET /api/capacitaciones] Params:", { activo });

    let queryText = `
      SELECT 
        id,
        banner,
        nombre,
        descripcion,
        cantidad_horas,
        cantidad_participantes,
        archivo_adjunto,
        fecha_inicio_inscripcion,
        fecha_final_inscripcion,
        fecha_inicio_capacitacion,
        fecha_final_capacitacion,
        activo,
        fecha_creacion,
        fecha_actualizacion
      FROM ciepi.capacitaciones
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
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
