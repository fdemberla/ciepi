import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { autorizarGestionNewsletter } from "./_auth";

export async function GET(request: NextRequest) {
  try {
    // Solo ADMIN, SUPER_ADMIN y RELACIONES_PUBLICAS (rol leído de la BD).
    const auth = await autorizarGestionNewsletter();
    if (!auth.ok) return auth.respuesta;

    const estado = request.nextUrl.searchParams.get("estado") || "";
    const VALID_ESTADOS = ["pendiente", "activo", "baja"];
    const hasFilter = VALID_ESTADOS.includes(estado);

    const [statsRes, subscribersRes, enviosRes] = await Promise.all([
      query(
        `SELECT
           COUNT(*) FILTER (WHERE estado = 'activo')::int AS activos,
           COUNT(*) FILTER (WHERE estado = 'pendiente')::int AS pendientes,
           COUNT(*) FILTER (WHERE estado = 'baja')::int AS bajas,
           COUNT(*)::int AS total
         FROM ciepi.newsletter_suscriptores`,
      ),
      query(
        `SELECT id, email, nombre, estado, version_politica,
                fecha_consentimiento, fecha_confirmacion, fecha_baja, creado_en
         FROM ciepi.newsletter_suscriptores
         ${hasFilter ? "WHERE estado = $1" : ""}
         ORDER BY creado_en DESC
         LIMIT 500`,
        hasFilter ? [estado] : [],
      ),
      query(
        `SELECT id, asunto, total_destinatarios, total_enviados, total_fallidos, enviado_por, fecha_envio
         FROM ciepi.newsletter_envios
         ORDER BY fecha_envio DESC
         LIMIT 50`,
      ),
    ]);

    return NextResponse.json({
      success: true,
      stats: statsRes.rows[0] || {
        activos: 0,
        pendientes: 0,
        bajas: 0,
        total: 0,
      },
      suscriptores: subscribersRes.rows,
      envios: enviosRes.rows,
    });
  } catch (error) {
    console.error("[Admin Newsletter] Error:", error);
    return NextResponse.json(
      {
        error: "Error al obtener datos del newsletter.",
        details: safeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}
