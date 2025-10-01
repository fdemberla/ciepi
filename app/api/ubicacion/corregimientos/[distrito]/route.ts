import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{
    distrito: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { distrito } = await params;

    if (!distrito) {
      return NextResponse.json(
        { error: "ID de distrito es requerido" },
        { status: 400 }
      );
    }

    // Convertir a número entero
    const distritoId = parseInt(distrito, 10);

    if (isNaN(distritoId)) {
      return NextResponse.json(
        { error: "ID de distrito inválido" },
        { status: 400 }
      );
    }

    // Obtener todos los corregimientos de un distrito
    const result = await query(
      `SELECT id, nombre, distrito_id 
       FROM ciepi.corregimientos 
       WHERE distrito_id = $1 
       ORDER BY nombre ASC`,
      [distritoId]
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
