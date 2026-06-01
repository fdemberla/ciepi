import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";

export async function GET() {
  try {
    // Obtener todos los distritos (sin filtro)
    const result = await query(
      `SELECT id, nombre, provincia_id 
       FROM ciepi.distritos 
       ORDER BY nombre ASC`
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching distritos:", error);
    return NextResponse.json(
      {
        error: "Error al obtener distritos",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
