import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Obtener sedes de formacion
    const tipos_consultas_result = await query(
      `
      SELECT 
        id as value,
        nombre as label
      FROM ciepi.tipos_consulta
      WHERE activo = true
    `,
      []
    );

    return NextResponse.json({
      success: true,
      sedes: tipos_consultas_result.rows.map(
        (row: { value: string; label: string }) => ({
          value: row.value,
          label: row.label,
        })
      ),
    });
  } catch (error) {
    console.error("Error obteniendo tipos de consultas:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error obteniendo tipos de consultas",
      },
      { status: 500 }
    );
  }
}
