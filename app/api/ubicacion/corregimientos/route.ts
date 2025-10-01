import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET() {
  try {
    // Obtener todos los corregimientos (sin filtro)
    const result = await query(
      `SELECT id, nombre, distrito_id 
       FROM ciepi.corregimientos 
       ORDER BY nombre ASC`
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching corregimientos:", error);
    return NextResponse.json(
      {
        error: "Error al obtener corregimientos",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
