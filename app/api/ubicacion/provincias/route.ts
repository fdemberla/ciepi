import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";

export async function GET() {
  try {
    // Obtener todas las provincias
    const result = await query(
      `SELECT id, nombre 
       FROM ciepi.provincias 
       ORDER BY nombre ASC`
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching provincias:", error);
    return NextResponse.json(
      {
        error: "Error al obtener provincias",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
