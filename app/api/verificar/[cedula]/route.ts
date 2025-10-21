import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{
    cedula: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { cedula } = await params;

    if (!cedula) {
      return NextResponse.json(
        { error: "Cédula es requerida" },
        { status: 400 }
      );
    }

    // Verificar si el estudiante ya existe en la base de datos
    const result = await query(
      `SELECT 
        id, 
        cedula, 
        nombres, 
        apellidos, 
        nombre_cedula,
        estado_civil,
        TO_CHAR(fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento,
        correo,
        telefono,
        sexo
      FROM ciepi.estudiantes 
      WHERE cedula = $1`,
      [cedula]
    );

    if (result.rows.length > 0) {
      // El estudiante ya existe
      return NextResponse.json({
        exists: true,
        estudiante: result.rows[0],
      });
    }

    // El estudiante NO existe, llamar al API externo para verificar
    try {
      const body = {
        cedulas: [cedula],
      };

      const apiRes = await fetch(process.env.CEDULA_API_URL!, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tool-name": process.env.CEDULA_API_TOOL!,
          "x-api-key": process.env.CEDULA_API_KEY!,
        },
        body: JSON.stringify(body),
      });

      if (!apiRes.ok) {
        throw new Error(
          `API externa respondió con status ${apiRes.status}: ${apiRes.statusText}`
        );
      }

      const externalData = await apiRes.json();

      // Verificar si la API retornó datos válidos
      if (
        !externalData ||
        !externalData.results ||
        externalData.results.length === 0
      ) {
        return NextResponse.json(
          {
            error: "Cédula no encontrada en el sistema nacional",
            message: "No se encontró información para esta cédula",
          },
          { status: 404 }
        );
      }

      // Extraer los datos del primer resultado
      const result = externalData.results[0];

      // Verificar que la consulta fue exitosa
      if (!result.success || !result.data) {
        return NextResponse.json(
          {
            error: "Error al obtener datos de la cédula",
            message: "La cédula no pudo ser validada",
          },
          { status: 404 }
        );
      }

      // Extraer los datos de la persona
      const personaData = result.data.DatasetPersona?.PersonaPublica;

      if (!personaData) {
        return NextResponse.json(
          {
            error: "Datos incompletos",
            message: "No se encontraron datos completos para esta cédula",
          },
          { status: 404 }
        );
      }

      // Formatear los datos para nuestro sistema
      const formattedData = {
        cedula: personaData.cedula || cedula,
        nombres:
          [personaData.primer_nombre, personaData.segundo_nombre]
            .filter(Boolean)
            .join(" ") || "",
        apellidos:
          [personaData.apellido_paterno, personaData.apellido_materno]
            .filter(Boolean)
            .join(" ") || "",
        nombre_cedula: personaData.nombreCedula || "",
        fecha_nacimiento: personaData.fecha_nacimiento
          ? new Date(personaData.fecha_nacimiento).toISOString().split("T")[0]
          : null,
        sexo: personaData.sexo || null,
        estado_civil: personaData.estado_civil || null,
      };

      return NextResponse.json({
        exists: false,
        external_data: formattedData,
        message:
          "Cédula verificada exitosamente. Por favor complete el formulario de inscripción.",
      });
    } catch (externalError) {
      console.error("Error calling external API:", externalError);
      return NextResponse.json(
        {
          error: "Error al verificar la cédula en el sistema externo",
          details:
            externalError instanceof Error
              ? externalError.message
              : "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error in verificar cedula API:", error);
    return NextResponse.json(
      {
        error: "Error al verificar la cédula",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Verifica si un correo electrónico ya está registrado en el sistema
 * Endpoint usado para validación en tiempo real en el formulario
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { correo, cedula_actual } = body;

    if (!correo) {
      return NextResponse.json(
        { error: "Correo es requerido" },
        { status: 400 }
      );
    }

    // Verificar si el correo ya existe (excluyendo la cédula actual si se proporciona)
    let queryText = `SELECT id, cedula, nombres, apellidos 
                     FROM ciepi.estudiantes 
                     WHERE correo = $1`;
    const queryParams: (string | null)[] = [correo];

    if (cedula_actual) {
      queryText += ` AND cedula != $2`;
      queryParams.push(cedula_actual);
    }

    const result = await query(queryText, queryParams);

    if (result.rows.length > 0) {
      //   const existingUser = result.rows[0];
      return NextResponse.json({
        available: false,
        message: "Este correo electrónico ya está registrado",
        existing_user: {
          nombres: "",
          apellidos: "",
        },
      });
    }

    return NextResponse.json({
      available: true,
      message: "Correo disponible",
    });
  } catch (error) {
    console.error("Error checking email availability:", error);
    return NextResponse.json(
      {
        error: "Error al verificar disponibilidad del correo",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
