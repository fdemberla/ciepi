import { NextRequest, NextResponse } from "next/server";
import {
  createVerificationToken,
  invalidatePreviousTokens,
} from "@/lib/verificationToken";
import { sendEmailVerification } from "@/lib/emailHelpers";
import { getVerificationUrl, getClientIp } from "@/lib/verificationUtils";
import { query } from "@/lib/db";

/**
 * POST /api/verificacion/generar
 * Genera un token de verificación y envía correo al estudiante
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { id_estudiante, tipo, metadata } = body;

    if (!id_estudiante || !tipo) {
      return NextResponse.json(
        {
          error: "Datos incompletos",
          details: "Se requiere id_estudiante y tipo",
        },
        { status: 400 }
      );
    }

    // Validar tipo
    const tiposValidos = ["inscripcion", "recuperacion", "cambio_correo"];
    if (!tiposValidos.includes(tipo)) {
      return NextResponse.json(
        {
          error: "Tipo inválido",
          details: `Tipo debe ser uno de: ${tiposValidos.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Obtener datos del estudiante
    const estudianteResult = await query(
      `SELECT id, nombres, apellidos, correo, correo_verificado
       FROM ciepi.estudiantes
       WHERE id = $1`,
      [id_estudiante]
    );

    if (estudianteResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Estudiante no encontrado" },
        { status: 404 }
      );
    }

    const estudiante = estudianteResult.rows[0];

    if (!estudiante.correo) {
      return NextResponse.json(
        { error: "El estudiante no tiene correo registrado" },
        { status: 400 }
      );
    }

    // Si el tipo es inscripción y el correo ya está verificado, no es necesario verificar nuevamente
    if (tipo === "inscripcion" && estudiante.correo_verificado) {
      return NextResponse.json(
        {
          success: true,
          already_verified: true,
          message: "El correo ya está verificado",
        },
        { status: 200 }
      );
    }

    // Obtener nombre de la capacitación si es una inscripción
    let nombreCapacitacion = "CIEPI";
    if (tipo === "inscripcion" && metadata?.capacitacion_id) {
      const capacitacionResult = await query(
        `SELECT nombre FROM ciepi.capacitaciones WHERE id = $1`,
        [metadata.capacitacion_id]
      );

      if (capacitacionResult.rows.length > 0) {
        nombreCapacitacion = capacitacionResult.rows[0].nombre;
      }
    }

    // Invalidar tokens anteriores del mismo tipo
    await invalidatePreviousTokens(id_estudiante, tipo);

    // Crear nuevo token (15 minutos de duración)
    const duracion_minutos = 15;
    const clientIp = getClientIp(request);

    const { token, fecha_expiracion } = await createVerificationToken({
      id_estudiante,
      correo: estudiante.correo,
      tipo,
      metadata: metadata || {},
      duracion_minutos,
      ip: clientIp || undefined,
    });

    // Generar URL de verificación
    const verificationUrl = getVerificationUrl(token);

    // Enviar correo de verificación
    await sendEmailVerification(
      estudiante.correo,
      estudiante.nombres,
      estudiante.apellidos,
      verificationUrl,
      nombreCapacitacion,
      duracion_minutos
    );

    return NextResponse.json(
      {
        success: true,
        message: "Correo de verificación enviado exitosamente",
        data: {
          token,
          correo: estudiante.correo,
          fecha_expiracion,
          duracion_minutos,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al generar token de verificación:", error);
    return NextResponse.json(
      {
        error: "Error al generar token de verificación",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
