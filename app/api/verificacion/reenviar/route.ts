import { NextRequest, NextResponse } from "next/server";
import {
  createVerificationToken,
  invalidatePreviousTokens,
  getTokenInfo,
} from "@/lib/verificationToken";
import { sendEmailVerification } from "@/lib/emailHelpers";
import { getVerificationUrl, getClientIp } from "@/lib/verificationUtils";
import { query } from "@/lib/db";

/**
 * POST /api/verificacion/reenviar
 * Reenvía un correo de verificación (útil cuando expira o no llega)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, id_estudiante, tipo, metadata } = body;

    // Opción 1: Reenviar basado en token anterior
    if (token) {
      const tokenInfo = await getTokenInfo(token);

      if (!tokenInfo) {
        return NextResponse.json(
          { error: "Token no encontrado" },
          { status: 404 }
        );
      }

      // Usar la información del token anterior para crear uno nuevo
      const estudianteId = tokenInfo.id_estudiante;
      const tipoToken = tokenInfo.tipo;
      const metadataToken = tokenInfo.metadata;

      // Obtener datos actualizados del estudiante
      const estudianteResult = await query(
        `SELECT id, nombres, apellidos, correo
         FROM ciepi.estudiantes
         WHERE id = $1`,
        [estudianteId]
      );

      if (estudianteResult.rows.length === 0) {
        return NextResponse.json(
          { error: "Estudiante no encontrado" },
          { status: 404 }
        );
      }

      const estudiante = estudianteResult.rows[0];

      // Obtener nombre de capacitación si aplica
      let nombreCapacitacion = "CIEPI";
      if (
        tipoToken === "inscripcion" &&
        metadataToken &&
        typeof metadataToken === "object" &&
        "capacitacion_id" in metadataToken
      ) {
        const capacitacionResult = await query(
          `SELECT nombre FROM ciepi.capacitaciones WHERE id = $1`,
          [metadataToken.capacitacion_id]
        );

        if (capacitacionResult.rows.length > 0) {
          nombreCapacitacion = capacitacionResult.rows[0].nombre;
        }
      }

      // Invalidar tokens anteriores
      await invalidatePreviousTokens(estudianteId, tipoToken);

      // Crear nuevo token
      const duracion_minutos = 15;
      const clientIp = getClientIp(request);

      const { token: newToken, fecha_expiracion } =
        await createVerificationToken({
          id_estudiante: estudianteId,
          correo: estudiante.correo,
          tipo: tipoToken,
          metadata: metadataToken || {},
          duracion_minutos,
          ip: clientIp || undefined,
        });

      // Generar URL de verificación
      const verificationUrl = getVerificationUrl(newToken);

      // Enviar correo
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
          message: "Correo de verificación reenviado exitosamente",
          data: {
            token: newToken,
            correo: estudiante.correo,
            fecha_expiracion,
            duracion_minutos,
          },
        },
        { status: 200 }
      );
    }

    // Opción 2: Reenviar basado en id_estudiante y tipo
    if (id_estudiante && tipo) {
      // Obtener datos del estudiante
      const estudianteResult = await query(
        `SELECT id, nombres, apellidos, correo
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

      // Obtener nombre de capacitación si aplica
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

      // Invalidar tokens anteriores
      await invalidatePreviousTokens(id_estudiante, tipo);

      // Crear nuevo token
      const duracion_minutos = 15;
      const clientIp = getClientIp(request);

      const { token: newToken, fecha_expiracion } =
        await createVerificationToken({
          id_estudiante,
          correo: estudiante.correo,
          tipo,
          metadata: metadata || {},
          duracion_minutos,
          ip: clientIp || undefined,
        });

      // Generar URL de verificación
      const verificationUrl = getVerificationUrl(newToken);

      // Enviar correo
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
            token: newToken,
            correo: estudiante.correo,
            fecha_expiracion,
            duracion_minutos,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        error: "Datos incompletos",
        details: "Se requiere 'token' o 'id_estudiante' y 'tipo' para reenviar",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error al reenviar correo de verificación:", error);
    return NextResponse.json(
      {
        error: "Error al reenviar correo de verificación",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
