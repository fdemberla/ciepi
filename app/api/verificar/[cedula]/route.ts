import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { getClientIp } from "@/lib/verificationUtils";
import {
  borrarCookieSesion,
  cedulaBloqueadaPorIntentos,
  crearSesion,
  obtenerSesion,
  ponerCookieSesion,
  superaLimiteSesionesIp,
  vistaSesion,
  type DatosPersona,
} from "@/lib/inscripcionSesion";
import { normalizarCedula, trasFalloFecha } from "@/lib/estados/inscripcionSesion";

interface Params {
  params: Promise<{
    cedula: string;
  }>;
}


type LookupResult = { exists: boolean; record: DatosPersona };

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

const MSG_DEMASIADOS_INTENTOS =
  "Demasiados intentos. Por seguridad, espera unas horas o acércate a una sede del INADEH.";

/**
 * Paso 1: consulta la cédula (requiere Turnstile y tiene límite por IP).
 * Abre una sesión de inscripción en el servidor y devuelve solo si la cédula existe.
 * NUNCA expone datos personales en este paso.
 */
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { cedula } = await params;
    const cleanCedula = cedula?.trim();
    if (!cleanCedula || cleanCedula.length > 30) {
      return NextResponse.json({ error: "Cédula es requerida" }, { status: 400 });
    }

    const ip = getClientIp(request);
    const turnstileToken =
      request.headers.get("x-turnstile-token") ||
      request.nextUrl.searchParams.get("turnstileToken");
    const turnstileCheck = await verifyTurnstileToken(turnstileToken, ip);
    if (!turnstileCheck.success) {
      return NextResponse.json(
        { error: turnstileCheck.error || "Verificación de seguridad fallida" },
        { status: 403 },
      );
    }

    if (await superaLimiteSesionesIp(ip)) {
      return NextResponse.json(
        { error: "Demasiadas consultas desde esta conexión. Intenta de nuevo en una hora." },
        { status: 429 },
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

    const capParam = parseInt(request.nextUrl.searchParams.get("capacitacion") || "", 10);
    const token = await crearSesion({
      cedula: lookup.record.cedula,
      idCapacitacion: Number.isInteger(capParam) && capParam > 0 ? capParam : null,
      idEstudiante: lookup.exists && lookup.record.id ? lookup.record.id : null,
      datosPersona: lookup.record,
      ip,
    });

    const res = NextResponse.json({
      found: true,
      exists: lookup.exists,
      cedula: lookup.record.cedula,
    });
    ponerCookieSesion(res, token);
    return res;
  } catch (error) {
    console.error("Error in GET /api/verificar/[cedula]:", error);
    return NextResponse.json(
      { error: "Error al verificar la cédula", details: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}

/**
 * Paso 2: confirma la fecha de nacimiento contra los datos guardados en la sesión.
 * Máximo de intentos por sesión y por cédula; no vuelve a consultar el Tribunal Electoral.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const { cedula } = await params;
    const sesion = await obtenerSesion(request);
    if (!sesion || normalizarCedula(sesion.cedula) !== normalizarCedula(cedula)) {
      return NextResponse.json(
        { error: "La consulta expiró. Vuelve a ingresar tu cédula.", code: "SESION_INVALIDA" },
        { status: 401 },
      );
    }

    if (sesion.estado === "identidad_verificada") {
      return NextResponse.json({ verified: true, ...(await vistaSesion(sesion)) });
    }
    if (sesion.estado !== "cedula_verificada" || (await cedulaBloqueadaPorIntentos(sesion.cedula))) {
      const res = NextResponse.json({ verified: false, error: MSG_DEMASIADOS_INTENTOS }, { status: 429 });
      borrarCookieSesion(res);
      return res;
    }

    const body = await request.json().catch(() => ({}));
    const rawBirthDate = typeof body.fechaNacimiento === "string" ? body.fechaNacimiento : "";
    const normalizedInput = normalizeBirthDate(rawBirthDate);
    if (!normalizedInput) {
      return NextResponse.json(
        { error: "Formato de fecha inválido. Use DD/MM/YYYY." },
        { status: 400 },
      );
    }

    const esperada = sesion.datos_persona.fecha_nacimiento;
    if (!esperada || esperada !== normalizedInput) {
      const { intentos, estado } = trasFalloFecha(sesion.intentos_fecha);
      await query(
        `UPDATE ciepi.inscripcion_sesiones SET intentos_fecha = $2, estado = $3
          WHERE id = $1 AND estado = 'cedula_verificada'`,
        [sesion.id, intentos, estado],
      );
      const bloqueada = estado === "bloqueada";
      const res = NextResponse.json(
        {
          verified: false,
          error: bloqueada
            ? MSG_DEMASIADOS_INTENTOS
            : "La fecha de nacimiento ingresada no coincide con nuestros registros.",
        },
        { status: bloqueada ? 429 : 403 },
      );
      if (bloqueada) borrarCookieSesion(res);
      return res;
    }

    await query(
      `UPDATE ciepi.inscripcion_sesiones SET estado = 'identidad_verificada'
        WHERE id = $1 AND estado = 'cedula_verificada'`,
      [sesion.id],
    );
    return NextResponse.json({
      verified: true,
      ...(await vistaSesion({ ...sesion, estado: "identidad_verificada" })),
    });
  } catch (error) {
    console.error("Error in PUT /api/verificar/[cedula]:", error);
    return NextResponse.json(
      { error: "Error al confirmar la fecha de nacimiento", details: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}

/**
 * Verifica si un correo ya está registrado. Solo con una sesión de identidad verificada,
 * para que no sirva para averiguar qué correos están registrados.
 */
export async function POST(request: NextRequest) {
  try {
    const sesion = await obtenerSesion(request);
    if (!sesion || sesion.estado !== "identidad_verificada") {
      return NextResponse.json({ error: "Sesión de inscripción no válida" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const correo = typeof body.correo === "string" ? body.correo.trim() : "";
    if (!correo) {
      return NextResponse.json({ error: "Correo es requerido" }, { status: 400 });
    }

    const result = await query(
      `SELECT 1 FROM ciepi.estudiantes
        WHERE LOWER(correo) = LOWER($1) AND id IS DISTINCT FROM $2`,
      [correo, sesion.id_estudiante],
    );

    return NextResponse.json(
      result.rows.length > 0
        ? { available: false, message: "Este correo electrónico ya está registrado" }
        : { available: true, message: "Correo disponible" },
    );
  } catch (error) {
    console.error("Error checking email availability:", error);
    return NextResponse.json(
      { error: "Error al verificar disponibilidad del correo", details: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}
