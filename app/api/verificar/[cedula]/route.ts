import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { getClientIp } from "@/lib/verificationUtils";

interface Params {
  params: Promise<{
    cedula: string;
  }>;
}

interface LookupResult {
  exists: boolean;
  record: {
    id?: number;
    cedula: string;
    nombres: string;
    apellidos: string;
    nombre_cedula: string;
    estado_civil: string | null;
    fecha_nacimiento: string | null;
    correo?: string | null;
    telefono?: string | null;
    sexo: string | null;
  };
}

function normalizeBirthDate(raw: string): string | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  const dmy = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (dmy) {
    return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
  }
  return null;
}

async function lookupCedulaRecord(cedula: string): Promise<LookupResult | null> {
  const dbRes = await query(
    `SELECT
       id, cedula, nombres, apellidos, nombre_cedula,
       estado_civil, TO_CHAR(fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento,
       correo, telefono, sexo
     FROM ciepi.estudiantes
     WHERE cedula = $1`,
    [cedula],
  );

  if (dbRes.rows.length > 0) {
    return { exists: true, record: dbRes.rows[0] };
  }

  const apiUrl = process.env.CEDULA_API_URL;
  const apiTool = process.env.CEDULA_API_TOOL;
  const apiKey = process.env.CEDULA_API_KEY;
  if (!apiUrl || !apiTool || !apiKey) {
    throw new Error("Configuración de API de cédulas incompleta");
  }

  const apiRes = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-tool-name": apiTool,
      "x-api-key": apiKey,
    },
    body: JSON.stringify({ cedulas: [cedula] }),
  });

  if (!apiRes.ok) {
    throw new Error(`API externa respondió con status ${apiRes.status}`);
  }

  const externalData = await apiRes.json();
  const first = externalData?.results?.[0];
  const personaData = first?.success ? first.data?.DatasetPersona?.PersonaPublica : null;

  if (!personaData) {
    return null;
  }

  return {
    exists: false,
    record: {
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
    },
  };
}

/**
 * Paso 1: Verifica si la cédula existe (con protección Turnstile).
 * NUNCA expone datos personales del Tribunal Electoral ni de ciepi.estudiantes.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { cedula } = await params;
    const cleanCedula = cedula?.trim();
    if (!cleanCedula) {
      return NextResponse.json(
        { error: "Cédula es requerida" },
        { status: 400 },
      );
    }

    const turnstileToken =
      request.headers.get("x-turnstile-token") ||
      request.nextUrl.searchParams.get("turnstileToken");

    const turnstileCheck = await verifyTurnstileToken(
      turnstileToken,
      getClientIp(request),
    );
    if (!turnstileCheck.success) {
      return NextResponse.json(
        { error: turnstileCheck.error || "Verificación de seguridad fallida" },
        { status: 403 },
      );
    }

    const lookup = await lookupCedulaRecord(cleanCedula);
    if (!lookup) {
      return NextResponse.json(
        {
          error: "Cédula no encontrada en el sistema nacional",
          message: "No se encontró información para esta cédula",
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      found: true,
      exists: lookup.exists,
      cedula: lookup.record.cedula,
    });
  } catch (error) {
    console.error("Error in GET /api/verificar/[cedula]:", error);
    return NextResponse.json(
      {
        error: "Error al verificar la cédula",
        details: safeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}

/**
 * Paso 2: Confirma la fecha de nacimiento contra el registro en servidor.
 * Solo si coincide, devuelve el nombre y los datos para continuar la inscripción.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { cedula } = await params;
    const cleanCedula = cedula?.trim();
    if (!cleanCedula) {
      return NextResponse.json(
        { error: "Cédula es requerida" },
        { status: 400 },
      );
    }

    const body = await request.json();
    const rawBirthDate =
      typeof body.fechaNacimiento === "string" ? body.fechaNacimiento : "";
    const normalizedInput = normalizeBirthDate(rawBirthDate);

    if (!normalizedInput) {
      return NextResponse.json(
        { error: "Formato de fecha inválido. Use DD/MM/YYYY." },
        { status: 400 },
      );
    }

    const lookup = await lookupCedulaRecord(cleanCedula);
    if (!lookup) {
      return NextResponse.json(
        { error: "Cédula no encontrada en el sistema nacional" },
        { status: 404 },
      );
    }

    if (
      !lookup.record.fecha_nacimiento ||
      lookup.record.fecha_nacimiento !== normalizedInput
    ) {
      return NextResponse.json(
        {
          verified: false,
          error:
            "La fecha de nacimiento ingresada no coincide con nuestros registros.",
        },
        { status: 403 },
      );
    }

    if (lookup.exists) {
      return NextResponse.json({
        verified: true,
        exists: true,
        estudiante: lookup.record,
      });
    }

    return NextResponse.json({
      verified: true,
      exists: false,
      external_data: lookup.record,
    });
  } catch (error) {
    console.error("Error in PUT /api/verificar/[cedula]:", error);
    return NextResponse.json(
      {
        error: "Error al confirmar la fecha de nacimiento",
        details: safeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}

/**
 * Verifica si un correo electrónico ya está registrado en el sistema.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { correo, cedula_actual } = body;

    if (!correo) {
      return NextResponse.json(
        { error: "Correo es requerido" },
        { status: 400 },
      );
    }

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
        details: safeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}
