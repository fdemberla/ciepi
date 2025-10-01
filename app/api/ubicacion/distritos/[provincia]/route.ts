import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{
    provincia: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { provincia } = await params;

    if (!provincia) {
      return NextResponse.json(
        { error: "ID de provincia es requerido" },
        { status: 400 }
      );
    }

    // Convertir a número entero
    const provinciaId = parseInt(provincia, 10);

    if (isNaN(provinciaId)) {
      return NextResponse.json(
        { error: "ID de provincia inválido" },
        { status: 400 }
      );
    }

    // Obtener todos los distritos de una provincia
    const result = await query(
      `SELECT id, nombre, provincia_id 
       FROM ciepi.distritos 
       WHERE provincia_id = $1 
       ORDER BY nombre ASC`,
      [provinciaId]
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
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
