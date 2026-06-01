import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";

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

    // Require cedula as identity verification (IDOR protection)
    const cedulaParam = request.nextUrl.searchParams.get("cedula");
    if (!cedulaParam || !cedulaParam.trim()) {
      return NextResponse.json(
        { error: "Se requiere cédula para acceder a este recurso" },
        { status: 400 }
      );
    }

    // Verify student exists and cedula matches (ownership verification)
    const estudianteResult = await query(
      "SELECT id, cedula FROM ciepi.estudiantes WHERE id = $1",
      [estudianteId]
    );

    if (estudianteResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Estudiante no encontrado" },
        { status: 404 }
      );
    }

    // IDOR protection: cedula must match the stored student cedula
    if (estudianteResult.rows[0].cedula !== cedulaParam.trim()) {
      return NextResponse.json(
        { error: "Datos de verificación no coinciden" },
        { status: 403 }
      );
    }

    // Buscar la ubicación del estudiante
    // Note: calle (street address) is intentionally excluded to limit PII exposure on this public endpoint
    const ubicacionResult = await query(
      `SELECT 
        id,
        id_usuario,
        provincia_id,
        distrito_id,
        corregimiento_id
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
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
