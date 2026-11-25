import { NextRequest, NextResponse } from "next/server";
import { safeErrorDetail } from "@/lib/apiError";
import { estadoPorConsulta } from "@/lib/verificationToken";
import { MAX_REENVIOS } from "@/lib/estados/verificacionCorreo";

interface Params {
  params: Promise<{ token: string }>;
}

/** Oculta parte del correo: ju***@dominio.com */
function enmascarar(correo: string): string {
  const [usuario, dominio] = correo.split("@");
  if (!dominio) return "***";
  return `${usuario.slice(0, 2)}***@${dominio}`;
}

/**
 * GET /api/verificacion/estado/[consulta]
 * Estado de la solicitud para la página de espera. Recibe el identificador de
 * consulta (no el enlace del correo, que nunca llega al navegador).
 * Estados: pendiente | verificado | invalidado | expirado.
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { token: consulta } = await params;
    const info = await estadoPorConsulta(consulta);
    if (!info) {
      return NextResponse.json({ error: "Solicitud no encontrada", code: "TOKEN_NOT_FOUND" }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      data: {
        estado: info.estado,
        correo: enmascarar(info.correo),
        reenvios_restantes: Math.max(0, MAX_REENVIOS - info.reenvios),
      },
    });
  } catch (error) {
    console.error("Error al verificar estado del token:", error);
    return NextResponse.json(
      { error: "Error al verificar el estado", details: safeErrorDetail(error) },
      { status: 500 }
    );
  }
}
