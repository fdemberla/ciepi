import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  createVerificationToken,
  invalidatePreviousTokens,
} from "@/lib/verificationToken";
import { sendEmailVerification } from "@/lib/emailHelpers";
import { getVerificationUrl, getClientIp } from "@/lib/verificationUtils";

interface Params {
  params: Promise<{
    capacitacion: string;
  }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    await params; // Await params to satisfy the Promise requirement
    const body = await request.json();

    const { estudiante, ubicacion, capacitacion_id } = body;

    if (!estudiante || !ubicacion || !capacitacion_id) {
      return NextResponse.json(
        {
          error: "Datos incompletos",
          details:
            "Se requieren datos del estudiante, ubicación y capacitación",
        },
        { status: 400 }
      );
    }

    // Verificar que la capacitación existe y está activa
    const capacitacionResult = await query(
      `SELECT id, nombre, activo, fecha_inicio_inscripcion, fecha_final_inscripcion
       FROM ciepi.capacitaciones 
       WHERE id = $1`,
      [capacitacion_id]
    );

    if (capacitacionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Capacitación no encontrada" },
        { status: 404 }
      );
    }

    const capacitacionData = capacitacionResult.rows[0];

    if (!capacitacionData.activo) {
      return NextResponse.json(
        { error: "Esta capacitación no está disponible para inscripciones" },
        { status: 400 }
      );
    }

    // Verificar fechas de inscripción
    const now = new Date();
    const fechaInicio = capacitacionData.fecha_inicio_inscripcion
      ? new Date(capacitacionData.fecha_inicio_inscripcion)
      : null;
    const fechaFinal = capacitacionData.fecha_final_inscripcion
      ? new Date(capacitacionData.fecha_final_inscripcion)
      : null;

    if (fechaInicio && now < fechaInicio) {
      return NextResponse.json(
        { error: "El período de inscripción aún no ha iniciado" },
        { status: 400 }
      );
    }

    if (fechaFinal && now > fechaFinal) {
      return NextResponse.json(
        { error: "El período de inscripción ha finalizado" },
        { status: 400 }
      );
    }

    let estudianteId: number;

    // Si el estudiante ya tiene ID, verificar que existe y actualizar datos
    if (estudiante.id) {
      const existingEstudiante = await query(
        "SELECT id, correo, correo_verificado FROM ciepi.estudiantes WHERE id = $1",
        [estudiante.id]
      );

      if (existingEstudiante.rows.length === 0) {
        return NextResponse.json(
          { error: "Estudiante no encontrado" },
          { status: 404 }
        );
      }

      // Si el correo cambió, verificar que no exista otro usuario con ese correo
      if (existingEstudiante.rows[0].correo !== estudiante.correo) {
        const correoCheck = await query(
          "SELECT id, nombres, apellidos FROM ciepi.estudiantes WHERE correo = $1 AND id != $2",
          [estudiante.correo, estudiante.id]
        );

        if (correoCheck.rows.length > 0) {
          //   const otherUser = correoCheck.rows[0];
          return NextResponse.json(
            {
              error: "Correo duplicado",
              message: `El correo ${estudiante.correo} ya está registrado en el sistema.`,
              field: "correo",
            },
            { status: 409 } // 409 Conflict
          );
        }
      }

      estudianteId = estudiante.id;

      // Actualizar datos del estudiante (correo y teléfono pueden cambiar)
      await query(
        `UPDATE ciepi.estudiantes 
         SET correo = $1, telefono = $2, nombres = $3, apellidos = $4
         WHERE id = $5`,
        [
          estudiante.correo,
          estudiante.telefono,
          estudiante.nombres,
          estudiante.apellidos,
          estudianteId,
        ]
      );

      // Actualizar ubicación si existe, o crear nueva
      const existingUbicacion = await query(
        "SELECT id FROM ciepi.estudiantes_ubicacion WHERE id_usuario = $1",
        [estudianteId]
      );

      if (existingUbicacion.rows.length > 0) {
        await query(
          `UPDATE ciepi.estudiantes_ubicacion 
           SET provincia_id = $1, distrito_id = $2, corregimiento_id = $3, calle = $4
           WHERE id_usuario = $5`,
          [
            ubicacion.provincia_id
              ? parseInt(ubicacion.provincia_id as string, 10)
              : null,
            ubicacion.distrito_id
              ? parseInt(ubicacion.distrito_id as string, 10)
              : null,
            ubicacion.corregimiento_id
              ? parseInt(ubicacion.corregimiento_id as string, 10)
              : null,
            ubicacion.calle || null,
            estudianteId,
          ]
        );
      } else {
        await query(
          `INSERT INTO ciepi.estudiantes_ubicacion (
            id_usuario, provincia_id, distrito_id, corregimiento_id, calle
          ) VALUES ($1, $2, $3, $4, $5)`,
          [
            estudianteId,
            ubicacion.provincia_id
              ? parseInt(ubicacion.provincia_id as string, 10)
              : null,
            ubicacion.distrito_id
              ? parseInt(ubicacion.distrito_id as string, 10)
              : null,
            ubicacion.corregimiento_id
              ? parseInt(ubicacion.corregimiento_id as string, 10)
              : null,
            ubicacion.calle || null,
          ]
        );
      }
    } else {
      // Verificar que el correo no esté registrado antes de crear nuevo estudiante
      if (estudiante.correo) {
        const correoCheck = await query(
          "SELECT id, nombres, apellidos, cedula FROM ciepi.estudiantes WHERE correo = $1",
          [estudiante.correo]
        );

        if (correoCheck.rows.length > 0) {
          return NextResponse.json(
            {
              error: "Correo duplicado",
              message: `El correo ${estudiante.correo} ya está registrado en el sistema.`,
              field: "correo",
            },
            { status: 409 } // 409 Conflict
          );
        }
      }

      // Crear nuevo estudiante
      try {
        const insertEstudianteResult = await query(
          `INSERT INTO ciepi.estudiantes (
            cedula, nombres, apellidos, nombre_cedula, sexo,
            estado_civil, fecha_nacimiento, correo, telefono, correo_verificado
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, false)
          RETURNING id`,
          [
            estudiante.cedula,
            estudiante.nombres,
            estudiante.apellidos,
            estudiante.nombre_cedula,
            estudiante.sexo || null,
            estudiante.estado_civil || null,
            estudiante.fecha_nacimiento || null,
            estudiante.correo || null,
            estudiante.telefono || null,
          ]
        );

        estudianteId = insertEstudianteResult.rows[0].id;
      } catch (dbError: unknown) {
        // Manejar errores de constraint violation de PostgreSQL
        if (dbError && typeof dbError === "object" && "code" in dbError) {
          const error = dbError as {
            code: string;
            constraint?: string;
            detail?: string;
          };

          if (error.code === "23505") {
            // unique_violation
            if (error.constraint === "estudiantes_cedula_unique") {
              return NextResponse.json(
                {
                  error: "Cédula duplicada",
                  message: "Esta cédula ya está registrada en el sistema",
                  field: "cedula",
                },
                { status: 409 }
              );
            } else if (error.constraint === "estudiantes_correo_unique") {
              return NextResponse.json(
                {
                  error: "Correo duplicado",
                  message:
                    "Este correo electrónico ya está registrado en el sistema.",
                  field: "correo",
                },
                { status: 409 }
              );
            }
          }
        }
        // Re-lanzar el error si no es un constraint violation conocido
        throw dbError;
      }

      // Insertar ubicación del estudiante
      await query(
        `INSERT INTO ciepi.estudiantes_ubicacion (
          id_usuario, provincia_id, distrito_id, corregimiento_id, calle
        ) VALUES ($1, $2, $3, $4, $5)`,
        [
          estudianteId,
          ubicacion.provincia_id
            ? parseInt(ubicacion.provincia_id as string, 10)
            : null,
          ubicacion.distrito_id
            ? parseInt(ubicacion.distrito_id as string, 10)
            : null,
          ubicacion.corregimiento_id
            ? parseInt(ubicacion.corregimiento_id as string, 10)
            : null,
          ubicacion.calle || null,
        ]
      );
    }

    // Verificar si el correo ya está verificado
    const estudianteInfo = await query(
      "SELECT correo_verificado, nombres, apellidos, correo FROM ciepi.estudiantes WHERE id = $1",
      [estudianteId]
    );

    const correoVerificado = estudianteInfo.rows[0].correo_verificado;

    // Verificar si ya está inscrito en esta capacitación
    const existingInscripcion = await query(
      `SELECT id FROM ciepi.inscripciones 
       WHERE id_usuario = $1 AND id_capacitacion = $2`,
      [estudianteId, capacitacion_id]
    );

    if (existingInscripcion.rows.length > 0) {
      return NextResponse.json(
        { error: "Ya está inscrito en esta capacitación" },
        { status: 400 }
      );
    }

    // Si el correo NO está verificado, enviar correo de verificación
    // Invalidar tokens anteriores del mismo tipo
    await invalidatePreviousTokens(estudianteId, "inscripcion");

    // Crear token de verificación
    const duracion_minutos = 15;
    const clientIp = getClientIp(request);

    const { token, fecha_expiracion } = await createVerificationToken({
      id_estudiante: estudianteId,
      correo: estudianteInfo.rows[0].correo,
      tipo: "inscripcion",
      metadata: { capacitacion_id: capacitacion_id },
      duracion_minutos,
      ip: clientIp || undefined,
    });

    // Generar URL de verificación
    const verificationUrl = getVerificationUrl(token);

    // Enviar correo de verificación
    await sendEmailVerification(
      estudianteInfo.rows[0].correo,
      estudianteInfo.rows[0].nombres,
      estudianteInfo.rows[0].apellidos,
      verificationUrl,
      capacitacionData.nombre,
      duracion_minutos
    );

    return NextResponse.json(
      {
        success: true,
        message: "Correo de verificación enviado. Por favor revisa tu email.",
        verification_required: true,
        token,
        estudiante_id: estudianteId,
        data: {
          correo: estudianteInfo.rows[0].correo,
          fecha_expiracion,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in inscripción API:", error);
    return NextResponse.json(
      {
        error: "Error al procesar la inscripción",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
