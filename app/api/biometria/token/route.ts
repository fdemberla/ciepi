import { NextRequest, NextResponse } from "next/server";
import { safeErrorDetail } from "@/lib/apiError";
import { withBasePath } from "@/lib/basePath";

/**
 * POST /api/biometria/token
 * Canje seguro servidor-a-servidor del Authorization Code + PKCE code_verifier
 * contra el Hub Centralizado de Validación Biométrica (INADEH / Tribunal Electoral)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, code_verifier, redirect_uri } = body;

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

    const clientId =
      process.env.NEXT_PUBLIC_BIOMETRIA_CLIENT_ID || "ciepi";

    const effectiveRedirectUri =
      redirect_uri ||
      process.env.NEXT_PUBLIC_BIOMETRIA_REDIRECT_URI ||
      `http://localhost:3000${withBasePath("/biometria/callback")}`;

    // Petición al endpoint /oauth/token del Hub
    const hubTokenUrl = `${hubBaseUrl}/oauth/token`;

    const tokenPayload = {
      grant_type: "authorization_code",
      client_id: clientId,
      code,
      redirect_uri: effectiveRedirectUri,
      code_verifier,
    };

    const hubResponse = await fetch(hubTokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(tokenPayload),
      cache: "no-store",
    });

    const responseData = await hubResponse.json().catch(() => null);

    if (!hubResponse.ok) {
      console.error("❌ Error en canje de token biométrico:", {
        status: hubResponse.status,
        data: responseData,
      });

      return NextResponse.json(
        {
          error:
            responseData?.detail ||
            responseData?.message ||
            "Error al canjear el código de autorización en el Hub Biométrico.",
          status: hubResponse.status,
        },
        { status: hubResponse.status }
      );
    }

    return NextResponse.json(responseData, { status: 200 });
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
