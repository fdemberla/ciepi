import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { autorizarGestionNewsletter } from "../_auth";
import { sendEmail } from "@/lib/smtp";
import {
  createUnsubscribeToken,
  getNewsletterBroadcastTemplate,
  getNewsletterUnsubscribeUrl,
  sanitizeNewsletterHtml,
} from "@/lib/newsletter";

export async function POST(request: NextRequest) {
  try {
    // Solo ADMIN, SUPER_ADMIN y RELACIONES_PUBLICAS (rol leído de la BD).
    const auth = await autorizarGestionNewsletter();
    if (!auth.ok) return auth.respuesta;

    const body = await request.json();
    const asunto = typeof body.asunto === "string" ? body.asunto.trim() : "";
    const contenidoHtml =
      typeof body.contenidoHtml === "string" ? body.contenidoHtml.trim() : "";

    if (!asunto || asunto.length > 255) {
      return NextResponse.json(
        { error: "El asunto es obligatorio (máximo 255 caracteres)." },
        { status: 400 },
      );
    }

    const cleanHtml = sanitizeNewsletterHtml(contenidoHtml);
    if (!cleanHtml) {
      return NextResponse.json(
        { error: "El contenido del boletín no puede estar vacío." },
        { status: 400 },
      );
    }

    const subscribersRes = await query(
      `SELECT id, email FROM ciepi.newsletter_suscriptores WHERE estado = 'activo' ORDER BY id ASC`,
    );
    const subscribers = subscribersRes.rows as Array<{ id: number; email: string }>;

    if (subscribers.length === 0) {
      return NextResponse.json(
        { error: "No hay suscriptores activos para enviar el boletín." },
        { status: 400 },
      );
    }

    let enviados = 0;
    let fallidos = 0;
    const BATCH_SIZE = 10;

    for (let i = 0; i < subscribers.length; i += BATCH_SIZE) {
      const batch = subscribers.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map((sub) => {
          const unsubToken = createUnsubscribeToken(sub.id, sub.email);
          const unsubUrl = getNewsletterUnsubscribeUrl(unsubToken);
          const tpl = getNewsletterBroadcastTemplate(asunto, cleanHtml, unsubUrl);
          return sendEmail({
            to: sub.email,
            subject: tpl.subject,
            text: tpl.text,
            html: tpl.html,
          });
        }),
      );

      for (const r of results) {
        if (r.status === "fulfilled") enviados++;
        else fallidos++;
      }
    }

    const enviadoPor = auth.email || auth.nombre || "admin";
    await query(
      `INSERT INTO ciepi.newsletter_envios (
        asunto, contenido_html, total_destinatarios, total_enviados, total_fallidos, enviado_por
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [asunto, cleanHtml, subscribers.length, enviados, fallidos, enviadoPor],
    );

    return NextResponse.json({
      success: true,
      totalDestinatarios: subscribers.length,
      totalEnviados: enviados,
      totalFallidos: fallidos,
      message: `Boletín enviado a ${enviados} de ${subscribers.length} suscriptores activos.`,
    });
  } catch (error) {
    console.error("[Admin Newsletter Enviar] Error:", error);
    return NextResponse.json(
      {
        error: "Error al enviar el boletín.",
        details: safeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}
