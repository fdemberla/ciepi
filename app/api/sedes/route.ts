import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Obtener sedes de formacion
    const sedes_result = await query(
      `
      SELECT 
        id as value,
        nombre as label
      FROM ciepi.sedes
      WHERE activo = true
    `,
      []
    );

    return NextResponse.json({
      success: true,
      sedes: sedes_result.rows.map((row: { value: string; label: string }) => ({
        value: row.value,
        label: row.label,
      })),
    });
  } catch (error) {
    console.error("Error obteniendo sedes:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error obteniendo sedes",
      },
      { status: 500 }
    );
  }
}
