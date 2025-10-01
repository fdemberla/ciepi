import { NextRequest, NextResponse } from "next/server";
import { checkTokenStatus } from "@/lib/verificationToken";

interface Params {
  params: Promise<{
    token: string;
  }>;
}

/**
 * GET /api/verificacion/estado/[token]
 * Verifica el estado de un token (para polling desde la página de espera)
 * Este endpoint es llamado repetidamente para verificar si el usuario hizo clic en el link
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

    // Verificar el estado del token
    const status = await checkTokenStatus(token);

    if (!status.exists) {
      return NextResponse.json(
        {
          error: "Token no encontrado",
          code: "TOKEN_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    // Preparar respuesta con el estado actual
    const response = {
      success: true,
      data: {
        existe: status.exists,
        usado: status.usado,
        expirado: status.expirado,
        estado: status.usado
          ? "verificado"
          : status.expirado
          ? "expirado"
          : "pendiente",
      },
    };

    // Si el token fue usado, es exitoso
    if (status.usado) {
      return NextResponse.json(
        {
          ...response,
          message: "Token verificado exitosamente",
        },
        { status: 200 }
      );
    }

    // Si el token expiró, informar al cliente
    if (status.expirado) {
      return NextResponse.json(
        {
          ...response,
          message: "El token ha expirado",
        },
        { status: 200 }
      );
    }

    // Token válido pero aún no usado
    return NextResponse.json(
      {
        ...response,
        message: "Esperando verificación",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al verificar estado del token:", error);
    return NextResponse.json(
      {
        error: "Error al verificar el estado del token",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
