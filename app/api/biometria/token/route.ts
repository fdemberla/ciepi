import { NextRequest, NextResponse } from "next/server";
import { safeErrorDetail } from "@/lib/apiError";
import { withBasePath } from "@/lib/basePath";
import { query } from "@/lib/db";
import { obtenerSesion, type BiometriaServidor } from "@/lib/inscripcionSesion";
import { normalizarCedula } from "@/lib/estados/inscripcionSesion";

const ESTADOS_APROBADOS = new Set(["APROBADO", "APROBADO_CON_OTP"]);

function numeroONull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/**
 * POST /api/biometria/token
 * Canje servidor-a-servidor del Authorization Code + PKCE contra el Hub biométrico.
 * El resultado se valida aquí (aprobado y misma cédula que la sesión de inscripción)
 * y se guarda en la sesión del servidor. Al navegador solo vuelve lo necesario para
 * mostrar la pantalla; la inscripción nunca confía en datos biométricos del cliente.
 */
export async function POST(request: NextRequest) {
  try {
    const sesion = await obtenerSesion(request);
    if (!sesion || sesion.estado !== "identidad_verificada") {
      return NextResponse.json(
        {
          error:
            "Tu sesión de inscripción expiró. Vuelve a ingresar tu cédula y fecha de nacimiento.",
          code: "SESION_INVALIDA",
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { code, code_verifier, redirect_uri } = body as {
      code?: string;
      code_verifier?: string;
      redirect_uri?: string;
    };

    if (!code || !code_verifier) {
      return NextResponse.json(
        {
          error: "Parámetros incompletos",
          details: "Se requieren 'code' y 'code_verifier' para completar el flujo PKCE.",
        },
        { status: 400 }
      );
    }

    const hubBaseUrl = (
      process.env.BIOMETRIA_HUB_URL ||
      process.env.NEXT_PUBLIC_BIOMETRIA_HUB_URL ||
      "http://localhost:8000"
    ).replace(/\/+$/, "");
    const clientId = process.env.NEXT_PUBLIC_BIOMETRIA_CLIENT_ID || "ciepi";
    // Debe coincidir con la usada en /oauth/authorize; el Hub valida que esté registrada.
    const redirectUri =
      process.env.NEXT_PUBLIC_BIOMETRIA_REDIRECT_URI ||
      (typeof redirect_uri === "string" && redirect_uri) ||
      `http://localhost:3000${withBasePath("/biometria/callback/")}`;

    const hubResponse = await fetch(`${hubBaseUrl}/oauth/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        redirect_uri: redirectUri,
        code_verifier,
      }),
      cache: "no-store",
    });
    const data = await hubResponse.json().catch(() => null);

    if (!hubResponse.ok || !data) {
      console.error("❌ Error en canje de token biométrico:", { status: hubResponse.status, data });
      return NextResponse.json(
        {
          error:
            data?.detail ||
            data?.message ||
            "Error al canjear el código de autorización en el Hub Biométrico.",
        },
        { status: hubResponse.ok ? 502 : hubResponse.status }
      );
    }

    const estado = typeof data.estado === "string" ? data.estado : "RECHAZADO";
    const aprobado = data.valido === true && ESTADOS_APROBADOS.has(estado) && Boolean(data.id_auditoria);

    if (aprobado && normalizarCedula(data.cedula) !== normalizarCedula(sesion.cedula)) {
      console.warn("⚠️ Biometría aprobada para otra cédula; se descarta.", { sesion: sesion.id });
      return NextResponse.json(
        {
          valido: false,
          estado: "CEDULA_NO_COINCIDE",
          error: "La validación facial corresponde a otra cédula. Inténtalo de nuevo con tu propia cédula.",
        },
        { status: 409 }
      );
    }

    if (aprobado) {
      const biometria: BiometriaServidor = {
        valido: true,
        estado,
        id_auditoria: String(data.id_auditoria),
        score_similitud: numeroONull(data.score_similitud),
        liveness_score: numeroONull(data.liveness_score),
        metodo_autenticacion: typeof data.metodo_autenticacion === "string" ? data.metodo_autenticacion : null,
        fecha: new Date().toISOString(),
      };
      await query(
        `UPDATE ciepi.inscripcion_sesiones SET biometria = $2
          WHERE id = $1 AND estado = 'identidad_verificada'`,
        [sesion.id, JSON.stringify(biometria)]
      );
    }

    return NextResponse.json({
      valido: aprobado,
      estado,
      cedula: sesion.cedula,
      id_auditoria: aprobado ? String(data.id_auditoria) : null,
      id_capacitacion: sesion.id_capacitacion,
    });
  } catch (error) {
    console.error("❌ Excepción en endpoint /api/biometria/token:", error);
    return NextResponse.json(
      {
        error: "Error interno al comunicarse con el servicio biométrico",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
