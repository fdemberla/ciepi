import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Obtener areas de formacion
    const areas_result = await query(
      `
      SELECT 
        id as value,
        nombre as label
      FROM ciepi.areas_formacion
      WHERE activo = true
    `,
      []
    );

    return NextResponse.json({
      success: true,
      areas: areas_result.rows.map((row: { value: string; label: string }) => ({
        value: row.value,
        label: row.label,
      })),
    });
  } catch (error) {
    console.error("Error obteniendo areas:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error obteniendo areas",
      },
      { status: 500 }
    );
  }
}
