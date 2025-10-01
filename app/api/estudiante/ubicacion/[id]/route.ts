import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: "ID del estudiante es requerido" },
        { status: 400 }
      );
    }

    // Validar que el ID sea un número válido
    const estudianteId = parseInt(id, 10);
    if (isNaN(estudianteId)) {
      return NextResponse.json(
        { error: "ID del estudiante debe ser un número válido" },
        { status: 400 }
      );
    }

    // Verificar que el estudiante existe
    const estudianteResult = await query(
      "SELECT id FROM ciepi.estudiantes WHERE id = $1",
      [estudianteId]
    );

    if (estudianteResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Estudiante no encontrado" },
        { status: 404 }
      );
    }

    // Buscar la ubicación del estudiante
    const ubicacionResult = await query(
      `SELECT 
        id,
        id_usuario,
        provincia_id,
        distrito_id,
        corregimiento_id,
        calle
      FROM ciepi.estudiantes_ubicacion 
      WHERE id_usuario = $1`,
      [estudianteId]
    );

    if (ubicacionResult.rows.length === 0) {
      return NextResponse.json(
        {
          error: "Ubicación no encontrada para este estudiante",
          message: "El estudiante no tiene información de ubicación registrada",
        },
        { status: 404 }
      );
    }

    // Retornar los datos de ubicación
    return NextResponse.json({
      success: true,
      data: ubicacionResult.rows[0],
      message: "Ubicación del estudiante obtenida exitosamente",
    });
  } catch (error) {
    console.error("Error en API de ubicación del estudiante:", error);
    return NextResponse.json(
      {
        error: "Error al obtener la ubicación del estudiante",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
