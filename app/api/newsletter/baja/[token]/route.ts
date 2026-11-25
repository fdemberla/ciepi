import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { maskEmail, verifyUnsubscribeToken } from "@/lib/newsletter";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const verified = verifyUnsubscribeToken(token);
    if (!verified) {
      return NextResponse.json(
        { valid: false, error: "Enlace de baja inválido." },
        { status: 400 },
      );
    }

    const result = await query(
      `SELECT id, email, estado FROM ciepi.newsletter_suscriptores WHERE id = $1 AND email = $2`,
      [verified.id, verified.email],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { valid: false, error: "Suscripción no encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      valid: true,
      estado: result.rows[0].estado,
      emailMasked: maskEmail(result.rows[0].email),
    });
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    const verified = verifyUnsubscribeToken(token);
    if (!verified) {
      return NextResponse.json(
        { success: false, error: "Enlace de baja inválido." },
        { status: 400 },
      );
    }

    const result = await query(
      `UPDATE ciepi.newsletter_suscriptores
       SET estado = 'baja',
           fecha_baja = NOW(),
           confirm_token_hash = NULL,
           confirm_token_expiracion = NULL,
           actualizado_en = NOW()
       WHERE id = $1 AND email = $2
       RETURNING id`,
      [verified.id, verified.email],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Suscripción no encontrada." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message:
        "Te has dado de baja correctamente. No recibirás más correos del boletín.",
    });
  } catch (error) {
    console.error("[Newsletter] Error al dar de baja:", error);
    return NextResponse.json(
      {
        success: false,
        error: "No se pudo procesar la baja.",
        details: safeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}
