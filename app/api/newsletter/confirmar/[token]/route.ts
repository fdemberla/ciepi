import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { hashConfirmToken } from "@/lib/newsletter";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
      return NextResponse.json(
        { success: false, error: "Enlace de confirmación inválido." },
        { status: 400 },
      );
    }

    const tokenHash = hashConfirmToken(token);
    const result = await query(
      `SELECT id, email, estado, confirm_token_expiracion
       FROM ciepi.newsletter_suscriptores
       WHERE confirm_token_hash = $1`,
      [tokenHash],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "El enlace de confirmación no es válido o ya fue utilizado.",
        },
        { status: 404 },
      );
    }

    const subscriber = result.rows[0];

    if (subscriber.estado === "activo") {
      return NextResponse.json({
        success: true,
        message: "Tu suscripción ya había sido confirmada.",
      });
    }

    if (
      !subscriber.confirm_token_expiracion ||
      new Date(subscriber.confirm_token_expiracion) < new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El enlace de confirmación ha expirado. Por favor, vuelve a suscribirte.",
        },
        { status: 410 },
      );
    }

    const updateRes = await query(
      `UPDATE ciepi.newsletter_suscriptores
       SET estado = 'activo',
           fecha_confirmacion = NOW(),
           confirm_token_hash = NULL,
           confirm_token_expiracion = NULL,
           actualizado_en = NOW()
       WHERE id = $1 AND estado = 'pendiente'`,
      [subscriber.id],
    );

    if ((updateRes.rowCount ?? 0) === 0) {
      const current = await query(
        `SELECT estado FROM ciepi.newsletter_suscriptores WHERE id = $1`,
        [subscriber.id],
      );
      if (current.rows[0]?.estado === "activo") {
        return NextResponse.json({
          success: true,
          message: "Tu suscripción ya había sido confirmada.",
        });
      }
      return NextResponse.json(
        {
          success: false,
          error: "La suscripción no puede confirmarse en su estado actual.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "¡Suscripción confirmada! A partir de ahora recibirás las novedades de CIEPI.",
    });
  } catch (error) {
    console.error("[Newsletter] Error al confirmar:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al confirmar la suscripción.",
        details: safeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}
