import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { cambiarEstado, respuestaErrorTransicion } from "@/lib/estadosServer";
import { validarTransicion } from "@/lib/estados/comun";
import {
  TRANSICIONES_NEWSLETTER,
  esEstadoSuscriptor,
  type EstadoSuscriptor,
} from "@/lib/estados/newsletter";
import { maskEmail, verifyUnsubscribeToken } from "@/lib/newsletter";
import { getClientIp } from "@/lib/verificationUtils";

/*
 * Baja del boletín con el enlace firmado (HMAC) del pie de cada envío.
 *
 * GET  → solo lectura: valida el enlace y devuelve el estado (la página muestra un botón).
 * POST → pendiente|activo → baja. Idempotente: si ya estaba de baja responde éxito.
 */

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
  request: NextRequest,
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
    const ip = getClientIp(request);

    const resultado = await withTransaction(async (q) => {
      const res = await q(
        `SELECT id, estado FROM ciepi.newsletter_suscriptores
         WHERE id = $1 AND email = $2
         FOR UPDATE`,
        [verified.id, verified.email],
      );
      if (res.rows.length === 0) return "no_encontrada" as const;

      const estado = res.rows[0].estado as unknown;
      if (estado === "baja") return "ya_de_baja" as const;
      if (!esEstadoSuscriptor(estado)) return "no_encontrada" as const;

      const v = validarTransicion(TRANSICIONES_NEWSLETTER, estado, "baja" as EstadoSuscriptor, {
        actor: "ciudadano",
      });
      if (!v.ok) return v;

      const ahora = new Date();
      await cambiarEstado<EstadoSuscriptor>(q, {
        entidad: "newsletter_suscriptor",
        tabla: "ciepi.newsletter_suscriptores",
        columnaEstado: "estado",
        id: verified.id,
        de: estado,
        a: "baja",
        accion: v.transicion.accion,
        actor: { tipo: "ciudadano" },
        motivo: "Enlace de baja del boletín",
        extra: {
          fecha_baja: ahora,
          confirm_token_hash: null,
          confirm_token_expiracion: null,
          actualizado_en: ahora,
        },
        ip,
      });
      return "dado_de_baja" as const;
    });

    if (resultado === "no_encontrada") {
      return NextResponse.json(
        { success: false, error: "Suscripción no encontrada." },
        { status: 404 },
      );
    }
    if (typeof resultado === "object") {
      return NextResponse.json(
        { success: false, error: resultado.motivo },
        { status: resultado.status },
      );
    }
    if (resultado === "ya_de_baja") {
      return NextResponse.json({
        success: true,
        yaDadoDeBaja: true,
        message: "Tu correo ya había sido dado de baja anteriormente.",
      });
    }

    return NextResponse.json({
      success: true,
      message:
        "Te has dado de baja correctamente. No recibirás más correos del boletín.",
    });
  } catch (error) {
    const errTransicion = respuestaErrorTransicion(error);
    if (errTransicion) return errTransicion;
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
