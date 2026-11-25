import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { registrarHistorial } from "@/lib/estadosServer";
import {
  HORAS_VALIDEZ_CONFIRMACION,
  esEstadoSuscriptor,
  eventoSuscripcion,
  motivoConsentimiento,
  type EstadoSuscriptor,
} from "@/lib/estados/newsletter";
import { safeErrorDetail } from "@/lib/apiError";
import { sendEmail } from "@/lib/smtp";
import { getClientIp } from "@/lib/verificationUtils";
import { verifyRecaptchaToken } from "@/lib/recaptcha";
import {
  NEWSLETTER_POLICY_VERSION,
  generateConfirmToken,
  getNewsletterConfirmUrl,
  getNewsletterConfirmationTemplate,
  hashConfirmToken,
  isValidEmail,
  normalizeEmail,
} from "@/lib/newsletter";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawEmail = typeof body.email === "string" ? body.email : "";
    const rawNombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 150) : null;
    const aceptoPolitica = body.aceptoPolitica === true;
    const recaptchaToken = typeof body.recaptchaToken === "string" ? body.recaptchaToken : "";

    if (!isValidEmail(rawEmail)) {
      return NextResponse.json(
        { error: "Por favor, ingresa un correo electrónico válido." },
        { status: 400 },
      );
    }

    if (!aceptoPolitica) {
      return NextResponse.json(
        {
          error:
            "Debes aceptar la Política de Privacidad para suscribirte al boletín.",
        },
        { status: 400 },
      );
    }

    const email = normalizeEmail(rawEmail);
    const clientIp = getClientIp(request);

    // El token es obligatorio si RECAPTCHA_SECRET_KEY está configurada (y en producción
    // la falta de la clave rechaza el envío): evita el envío masivo de confirmaciones.
    const captcha = await verifyRecaptchaToken(recaptchaToken, { accion: "newsletter", remoteIp: clientIp });
    if (!captcha.success) {
      return NextResponse.json(
        { error: captcha.error ?? "Verificación de seguridad fallida. Intenta de nuevo." },
        { status: captcha.status ?? 400 },
      );
    }

    const token = generateConfirmToken();
    const tokenHash = hashConfirmToken(token);
    const expiracion = new Date(Date.now() + HORAS_VALIDEZ_CONFIRMACION * 60 * 60 * 1000);

    // Alta atómica: un solo INSERT ... ON CONFLICT. Un suscriptor 'activo' nunca vuelve a
    // 'pendiente' (WHERE s.estado <> 'activo' → no devuelve fila) y dos altas simultáneas
    // del mismo correo no chocan con la restricción UNIQUE.
    const alta = await withTransaction(async (q) => {
      const res = await q(
        `WITH previo AS (
           SELECT estado FROM ciepi.newsletter_suscriptores WHERE email = $1
         ), up AS (
           INSERT INTO ciepi.newsletter_suscriptores AS s (
             email, nombre, estado, confirm_token_hash, confirm_token_expiracion,
             acepto_politica, version_politica, fecha_consentimiento, ip_consentimiento
           ) VALUES ($1, $2, 'pendiente', $3, $4, true, $5, NOW(), $6)
           ON CONFLICT (email) DO UPDATE
             SET nombre = COALESCE(EXCLUDED.nombre, s.nombre),
                 estado = 'pendiente',
                 confirm_token_hash = EXCLUDED.confirm_token_hash,
                 confirm_token_expiracion = EXCLUDED.confirm_token_expiracion,
                 acepto_politica = true,
                 version_politica = EXCLUDED.version_politica,
                 fecha_consentimiento = NOW(),
                 ip_consentimiento = EXCLUDED.ip_consentimiento,
                 fecha_baja = NULL,
                 actualizado_en = NOW()
             WHERE s.estado <> 'activo'
           RETURNING s.id, (s.xmax = 0) AS insertado
         )
         SELECT up.id, up.insertado, (SELECT estado FROM previo) AS estado_previo FROM up`,
        [email, rawNombre || null, tokenHash, expiracion, NEWSLETTER_POLICY_VERSION, clientIp],
      );
      if (res.rows.length === 0) return null; // ya estaba activo: no se toca

      const fila = res.rows[0] as { id: number; insertado: boolean; estado_previo: string | null };
      // Si otra petición insertó la fila entre medias, el estado previo era 'pendiente'.
      const previo: EstadoSuscriptor | null = fila.insertado
        ? null
        : esEstadoSuscriptor(fila.estado_previo)
          ? fila.estado_previo
          : "pendiente";
      const evento = eventoSuscripcion(previo);
      if (evento) {
        // Registro auditable del consentimiento (Ley 81): cada alta queda en el historial.
        await registrarHistorial(q, {
          entidad: "newsletter_suscriptor",
          entidadId: fila.id,
          de: evento.de,
          a: evento.a,
          accion: evento.accion,
          actor: { tipo: "ciudadano" },
          motivo: motivoConsentimiento(NEWSLETTER_POLICY_VERSION),
          ip: clientIp,
        });
      }
      return fila;
    });

    if (!alta) {
      return NextResponse.json({
        success: true,
        alreadySubscribed: true,
        message: "Este correo electrónico ya está suscrito al boletín de CIEPI.",
      });
    }

    const confirmUrl = getNewsletterConfirmUrl(token);
    const template = getNewsletterConfirmationTemplate(rawNombre, confirmUrl);

    await sendEmail({
      to: email,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });

    return NextResponse.json({
      success: true,
      message:
        "Te enviamos un correo de confirmación. Revisa tu bandeja de entrada para activar tu suscripción.",
    });
  } catch (error) {
    console.error("[Newsletter] Error en suscripción:", error);
    return NextResponse.json(
      {
        error: "No se pudo procesar la suscripción en este momento.",
        details: safeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}
