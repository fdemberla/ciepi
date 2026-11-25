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
 * Obtiene (o crea si no existe) el ID del estado "Pendiente de validación"
 * en ciepi.inscripciones_estados para las inscripciones manuales/presenciales.
 */
async function getPendienteValidacionEstadoId(): Promise<number> {
  const res = await query(
    `SELECT id FROM ciepi.inscripciones_estados WHERE LOWER(nombre) LIKE 'pendiente%' ORDER BY id LIMIT 1`
  );
  if (res.rows.length > 0) {
    return res.rows[0].id as number;
  }

  const insertRes = await query(
    `INSERT INTO ciepi.inscripciones_estados (id, nombre, descripcion)
     SELECT COALESCE(MAX(id), 0) + 1, $1, $2
     FROM ciepi.inscripciones_estados
     RETURNING id`,
    [
      "Pendiente de validación",
      "Inscripción con validación manual o presencial pendiente de revisión por un administrador",
    ]
  );
  return insertRes.rows[0].id as number;
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
      const metadata = tokenInfo.metadata as {
        capacitacion_id?: number;
        metodo_validacion?: "biometrica" | "manual";
        biometria?: {
          valido?: boolean;
          id_auditoria?: string;
          score_similitud?: number;
          liveness_score?: number;
          estado?: string;
        } | null;
      };

      if (metadata.capacitacion_id) {
        const esBiometrica = Boolean(
          metadata.biometria?.valido && metadata.metodo_validacion !== "manual"
        );

        // Si es validación manual/presencial, el estado de inscripción queda como "Pendiente de validación"
        const estadoInicialId = esBiometrica
          ? 1
          : await getPendienteValidacionEstadoId();

        // Obtener información de la capacitación para mostrar en la pantalla de confirmación
        const capRes = await query(
          `SELECT nombre, fecha_inicio_capacitacion FROM ciepi.capacitaciones WHERE id = $1`,
          [metadata.capacitacion_id]
        );
        const capacitacionInfo =
          capRes.rows.length > 0 ? capRes.rows[0] : undefined;

        // Verificar si ya existe la inscripción
        const existingInscripcion = await query(
          `SELECT id, estado_inscripcion
           FROM ciepi.inscripciones
           WHERE id_usuario = $1 AND id_capacitacion = $2`,
          [tokenInfo.id_estudiante, metadata.capacitacion_id]
        );

        if (existingInscripcion.rows.length > 0) {
          if (esBiometrica && metadata.biometria) {
            await query(
              `UPDATE ciepi.inscripciones
               SET biometria_verificada = true,
                   biometria_id_auditoria = $1,
                   biometria_score = $2,
                   biometria_liveness = $3,
                   biometria_estado = $4,
                   biometria_fecha = CURRENT_TIMESTAMP
               WHERE id = $5`,
              [
                metadata.biometria.id_auditoria || null,
                metadata.biometria.score_similitud || null,
                metadata.biometria.liveness_score || null,
                metadata.biometria.estado || null,
                existingInscripcion.rows[0].id,
              ]
            );
          }

          additionalData = {
            inscripcion_id: existingInscripcion.rows[0].id,
            estado_inscripcion: existingInscripcion.rows[0].estado_inscripcion,
            metodo_validacion: esBiometrica ? "biometrica" : "manual",
            capacitacion: capacitacionInfo,
            message: "Inscripción ya existente actualizada",
          };
        } else {
          // Crear la inscripción con auditoría biométrica o como Pendiente de validación (manual)
          const bio = metadata.biometria;
          const inscripcionResult = await query(
            `INSERT INTO ciepi.inscripciones (
              id_usuario, id_capacitacion, estado_inscripcion,
              biometria_verificada, biometria_id_auditoria, biometria_score,
              biometria_liveness, biometria_estado, biometria_fecha
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, estado_inscripcion, fecha_inscripcion`,
            [
              tokenInfo.id_estudiante,
              metadata.capacitacion_id,
              estadoInicialId,
              esBiometrica,
              esBiometrica ? bio?.id_auditoria || null : null,
              esBiometrica ? bio?.score_similitud || null : null,
              esBiometrica ? bio?.liveness_score || null : null,
              esBiometrica
                ? bio?.estado || "APROBADO"
                : "PENDIENTE_VALIDACION_MANUAL",
              esBiometrica ? new Date() : null,
            ]
          );

          additionalData = {
            inscripcion_id: inscripcionResult.rows[0].id,
            estado_inscripcion: inscripcionResult.rows[0].estado_inscripcion,
            metodo_validacion: esBiometrica ? "biometrica" : "manual",
            fecha_inscripcion: inscripcionResult.rows[0].fecha_inscripcion,
            capacitacion: capacitacionInfo,
            message: esBiometrica
              ? "Inscripción creada exitosamente"
              : "Inscripción registrada como pendiente de validación por un administrador",
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
