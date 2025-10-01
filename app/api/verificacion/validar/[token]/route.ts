import { NextRequest, NextResponse } from "next/server";
import {
  validateVerificationToken,
  markTokenAsUsed,
  getTokenInfo,
} from "@/lib/verificationToken";
import { getClientIp } from "@/lib/verificationUtils";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{
    token: string;
  }>;
}

/**
 * POST /api/verificacion/validar/[token]
 * Valida un token cuando el usuario hace clic en el link del correo
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Token no proporcionado" },
        { status: 400 }
      );
    }

    // Validar el token
    const validation = await validateVerificationToken(token);

    if (!validation.valid) {
      let errorMessage = "Token inválido";
      let errorCode = "INVALID_TOKEN";

      if (validation.expired) {
        errorMessage = "El enlace de verificación ha expirado";
        errorCode = "TOKEN_EXPIRED";
      } else if (validation.used) {
        errorMessage = "Este enlace ya fue usado";
        errorCode = "TOKEN_ALREADY_USED";
      } else if (validation.not_found) {
        errorMessage = "El enlace de verificación no existe";
        errorCode = "TOKEN_NOT_FOUND";
      }

      return NextResponse.json(
        {
          error: errorMessage,
          code: errorCode,
        },
        { status: 400 }
      );
    }

    // Obtener IP del cliente
    const clientIp = getClientIp(request);

    // Marcar token como usado
    const marked = await markTokenAsUsed(token, clientIp || undefined);

    if (!marked) {
      return NextResponse.json(
        { error: "Error al marcar el token como usado" },
        { status: 500 }
      );
    }

    // Obtener información completa del token
    const tokenInfo = await getTokenInfo(token);

    if (!tokenInfo) {
      return NextResponse.json(
        { error: "Error al obtener información del token" },
        { status: 500 }
      );
    }

    // Marcar el correo como verificado en la tabla de estudiantes
    await query(
      `UPDATE ciepi.estudiantes
       SET correo_verificado = true
       WHERE id = $1`,
      [tokenInfo.id_estudiante]
    );

    // Procesar según el tipo de verificación
    let additionalData = {};

    if (tokenInfo.tipo === "inscripcion") {
      // Si es una inscripción, podemos completar la inscripción aquí
      const metadata = tokenInfo.metadata as { capacitacion_id?: number };

      if (metadata.capacitacion_id) {
        // Verificar si ya existe la inscripción
        const existingInscripcion = await query(
          `SELECT id, estado_inscripcion
           FROM ciepi.inscripciones
           WHERE id_usuario = $1 AND id_capacitacion = $2`,
          [tokenInfo.id_estudiante, metadata.capacitacion_id]
        );

        if (existingInscripcion.rows.length > 0) {
          additionalData = {
            inscripcion_id: existingInscripcion.rows[0].id,
            estado_inscripcion: existingInscripcion.rows[0].estado_inscripcion,
            message: "Inscripción ya existente actualizada",
          };
        } else {
          // Crear la inscripción
          const inscripcionResult = await query(
            `INSERT INTO ciepi.inscripciones (
              id_usuario, id_capacitacion, estado_inscripcion
            ) VALUES ($1, $2, 1)
            RETURNING id, estado_inscripcion, fecha_inscripcion`,
            [tokenInfo.id_estudiante, metadata.capacitacion_id]
          );

          additionalData = {
            inscripcion_id: inscripcionResult.rows[0].id,
            estado_inscripcion: inscripcionResult.rows[0].estado_inscripcion,
            fecha_inscripcion: inscripcionResult.rows[0].fecha_inscripcion,
            message: "Inscripción creada exitosamente",
          };
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Correo verificado exitosamente",
        data: {
          estudiante: {
            id: tokenInfo.id_estudiante,
            nombres: tokenInfo.nombres,
            apellidos: tokenInfo.apellidos,
            correo: tokenInfo.correo,
          },
          tipo: tokenInfo.tipo,
          ...additionalData,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al validar token:", error);
    return NextResponse.json(
      {
        error: "Error al validar el token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/verificacion/validar/[token]
 * Obtiene información del token sin validarlo (para mostrar info antes de validar)
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json(
        { error: "Token no proporcionado" },
        { status: 400 }
      );
    }

    // Obtener información del token
    const tokenInfo = await getTokenInfo(token);

    if (!tokenInfo) {
      return NextResponse.json(
        { error: "Token no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si está expirado
    const now = new Date();
    const expiration = new Date(tokenInfo.fecha_expiracion);
    const expirado = now > expiration;

    return NextResponse.json(
      {
        success: true,
        data: {
          estudiante: {
            nombres: tokenInfo.nombres,
            apellidos: tokenInfo.apellidos,
            correo: tokenInfo.correo,
          },
          tipo: tokenInfo.tipo,
          usado: tokenInfo.usado,
          expirado,
          fecha_expiracion: tokenInfo.fecha_expiracion,
          metadata: tokenInfo.metadata,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al obtener información del token:", error);
    return NextResponse.json(
      {
        error: "Error al obtener información del token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
