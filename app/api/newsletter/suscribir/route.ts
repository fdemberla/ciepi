import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { sendEmail } from "@/lib/smtp";
import { getClientIp } from "@/lib/verificationUtils";
import {
  NEWSLETTER_POLICY_VERSION,
  generateConfirmToken,
  getNewsletterConfirmUrl,
  getNewsletterConfirmationTemplate,
  hashConfirmToken,
  isValidEmail,
  normalizeEmail,
} from "@/lib/newsletter";

async function verifyRecaptcha(token: string): Promise<boolean> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;
  if (!secretKey) return true;

  try {
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${secretKey}&response=${encodeURIComponent(token)}`,
      },
    );
    const data = await response.json();
    if (!data.success) return false;
    if (typeof data.score === "number" && data.score < 0.5) return false;
    return true;
  } catch (error) {
    console.error("[Newsletter] Error verificando reCAPTCHA:", error);
    return false;
  }
}

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

    if (recaptchaToken) {
      const recaptchaOk = await verifyRecaptcha(recaptchaToken);
      if (!recaptchaOk) {
        return NextResponse.json(
          { error: "Verificación de seguridad fallida. Intenta de nuevo." },
          { status: 400 },
        );
      }
    }

    const email = normalizeEmail(rawEmail);
    const clientIp = getClientIp(request);

    const existing = await query(
      `SELECT id, estado FROM ciepi.newsletter_suscriptores WHERE email = $1`,
      [email],
    );

    if (existing.rows.length > 0 && existing.rows[0].estado === "activo") {
      return NextResponse.json({
        success: true,
        alreadySubscribed: true,
        message: "Este correo electrónico ya está suscrito al boletín de CIEPI.",
      });
    }

    const token = generateConfirmToken();
    const tokenHash = hashConfirmToken(token);
    const expiracion = new Date(Date.now() + 24 * 60 * 60 * 1000);

    if (existing.rows.length > 0) {
      await query(
        `UPDATE ciepi.newsletter_suscriptores
         SET nombre = COALESCE($1, nombre),
             estado = 'pendiente',
             confirm_token_hash = $2,
             confirm_token_expiracion = $3,
             acepto_politica = true,
             version_politica = $4,
             fecha_consentimiento = NOW(),
             ip_consentimiento = $5,
             fecha_baja = NULL,
             actualizado_en = NOW()
         WHERE id = $6`,
        [
          rawNombre || null,
          tokenHash,
          expiracion,
          NEWSLETTER_POLICY_VERSION,
          clientIp,
          existing.rows[0].id,
        ],
      );
    } else {
      await query(
        `INSERT INTO ciepi.newsletter_suscriptores (
          email, nombre, estado, confirm_token_hash, confirm_token_expiracion,
          acepto_politica, version_politica, fecha_consentimiento, ip_consentimiento
        ) VALUES ($1, $2, 'pendiente', $3, $4, true, $5, NOW(), $6)`,
        [
          email,
          rawNombre || null,
          tokenHash,
          expiracion,
          NEWSLETTER_POLICY_VERSION,
          clientIp,
        ],
      );
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
