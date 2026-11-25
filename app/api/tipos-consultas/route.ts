import { NextResponse } from "next/server";
import { safeErrorDetail } from "@/lib/apiError";
import { query } from "@/lib/db";

// GET: Listar tipos de consulta activos (público para formulario de contacto)
export async function GET() {
  try {
    const tiposQuery = `
      SELECT 
        id,
        nombre,
        activo
      FROM ciepi.tipos_consulta
      WHERE activo = true
      ORDER BY nombre ASC
    `;

    const result = await query(tiposQuery, []);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error obteniendo tipos de consulta:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener tipos de consulta",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
