import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET - Obtener todos los estados de inscripción
export async function GET() {
  try {
    const result = await query(
      `SELECT 
        id,
        nombre,
        descripcion
      FROM ciepi.inscripciones_estados
      ORDER BY id`,
      []
    );

    return NextResponse.json({
      success: true,
      data: result.rows.map((row) => ({
        id: row.id,
        nombre: row.nombre,
        descripcion: row.descripcion,
      })),
    });
  } catch (error) {
    console.error("Error obteniendo estados de inscripción:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
