import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// PUT - Actualizar el estado de una inscripción
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const inscripcionId = parseInt(id, 10);

    if (isNaN(inscripcionId)) {
      return NextResponse.json(
        { error: "ID de inscripción inválido" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { estado_inscripcion } = body;

    if (!estado_inscripcion || isNaN(parseInt(estado_inscripcion, 10))) {
      return NextResponse.json(
        { error: "Estado de inscripción inválido" },
        { status: 400 }
      );
    }

    // Verificar que la inscripción existe
    const inscripcionResult = await query(
      "SELECT id FROM ciepi.inscripciones WHERE id = $1",
      [inscripcionId]
    );

    if (inscripcionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que el estado existe
    const estadoResult = await query(
      "SELECT id, nombre FROM ciepi.inscripciones_estados WHERE id = $1",
      [estado_inscripcion]
    );

    if (estadoResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Estado de inscripción no válido" },
        { status: 400 }
      );
    }

    // Actualizar el estado de la inscripción
    const updateResult = await query(
      `UPDATE ciepi.inscripciones 
       SET estado_inscripcion = $1
       WHERE id = $2
       RETURNING id, estado_inscripcion, fecha_ultima_actualizacion`,
      [estado_inscripcion, inscripcionId]
    );

    if (updateResult.rows.length === 0) {
      return NextResponse.json(
        { error: "No se pudo actualizar la inscripción" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Estado de inscripción actualizado correctamente",
      data: {
        inscripcion_id: updateResult.rows[0].id,
        nuevo_estado: {
          id: estado_inscripcion,
          nombre: estadoResult.rows[0].nombre,
        },
        fecha_actualizacion: updateResult.rows[0].fecha_ultima_actualizacion,
      },
    });
  } catch (error) {
    console.error("Error actualizando estado de inscripción:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
