import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { validateInscripcionTransition } from "@/lib/inscripcionStates";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// PUT - Actualizar el estado de una inscripción
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      );
    }

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

    // Verificar que la inscripción existe y obtener su estado actual
    const inscripcionResult = await query(
      "SELECT id, estado_inscripcion FROM ciepi.inscripciones WHERE id = $1",
      [inscripcionId]
    );

    if (inscripcionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Inscripción no encontrada" },
        { status: 404 }
      );
    }

    const currentEstado = Number(inscripcionResult.rows[0].estado_inscripcion);
    const targetEstado = parseInt(String(estado_inscripcion), 10);
    const userRole = session.user.rolId ?? 0;

    const transition = validateInscripcionTransition(
      currentEstado,
      targetEstado,
      userRole,
    );
    if (!transition.allowed) {
      return NextResponse.json(
        { error: transition.reason || "Transición de estado no permitida" },
        { status: transition.status || 400 }
      );
    }

    if (transition.isOverride) {
      console.warn(
        `[Inscripcion State Override] Admin ${session.user.adminId} (rol ${userRole}) reabrió inscripción ${inscripcionId}: ${currentEstado} -> ${targetEstado}`,
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
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
