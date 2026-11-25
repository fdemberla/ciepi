import { createHash, createHmac, randomBytes, timingSafeEqual } from "crypto";
import type { EmailTemplate } from "@/lib/emailTemplates";
import { getBaseUrl } from "@/lib/verificationUtils";

export const NEWSLETTER_POLICY_VERSION = "1.0";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  const normalized = normalizeEmail(email);
  return normalized.length > 3 && normalized.length <= 255 && EMAIL_REGEX.test(normalized);
}

export function generateConfirmToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashConfirmToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function getUnsubscribeSecret(): string {
  const secret = process.env.NEWSLETTER_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("NEXTAUTH_SECRET o NEWSLETTER_SECRET debe estar configurado");
    }
    return "dev-newsletter-secret-change-me";
  }
  return secret;
}

/**
 * Genera un token HMAC firmado para darse de baja en 1 clic sin expiración.
 */
export function createUnsubscribeToken(subscriberId: number, email: string): string {
  const payload = Buffer.from(
    JSON.stringify({ id: subscriberId, email: normalizeEmail(email) }),
    "utf8",
  ).toString("base64url");
  const sig = createHmac("sha256", getUnsubscribeSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

/**
 * Verifica un token HMAC de baja y retorna el id y correo del suscriptor si es válido.
 */
export function verifyUnsubscribeToken(
  token: string,
): { id: number; email: string } | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  if (!payload || !sig) return null;

  const expectedSig = createHmac("sha256", getUnsubscribeSecret())
    .update(payload)
    .digest("base64url");

  const sigBuf = Buffer.from(sig, "utf8");
  const expectedBuf = Buffer.from(expectedSig, "utf8");
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;

  try {
    const parsed = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as { id?: unknown; email?: unknown };
    if (typeof parsed.id === "number" && typeof parsed.email === "string") {
      return { id: parsed.id, email: normalizeEmail(parsed.email) };
    }
    return null;
  } catch {
    return null;
  }
}

export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Sanitiza HTML básico para envíos de boletines eliminando scripts, iframes y handlers inline.
 */
export function sanitizeNewsletterHtml(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "")
    .replace(/\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/javascript:/gi, "");
}

interface SlateNodeLike {
  type?: string;
  text?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  url?: string;
  children?: SlateNodeLike[];
}

/**
 * Convierte nodos de Slate (usado en SlateEditorField) a HTML limpio para correo.
 */
export function slateNodesToHtml(nodes: unknown): string {
  if (!Array.isArray(nodes)) return "";

  const renderNode = (node: SlateNodeLike): string => {
    if (typeof node.text === "string") {
      let text = escapeHtml(node.text).replace(/\n/g, "<br />");
      if (node.bold) text = `<strong>${text}</strong>`;
      if (node.italic) text = `<em>${text}</em>`;
      if (node.underline) text = `<u>${text}</u>`;
      return text;
    }

    const childrenHtml = Array.isArray(node.children)
      ? node.children.map(renderNode).join("")
      : "";

    switch (node.type) {
      case "heading-one":
        return `<h1 style="font-size:22px;font-weight:700;margin:16px 0 8px;color:#111827;">${childrenHtml}</h1>`;
      case "heading-two":
        return `<h2 style="font-size:18px;font-weight:700;margin:14px 0 8px;color:#111827;">${childrenHtml}</h2>`;
      case "bulleted-list":
        return `<ul style="padding-left:20px;margin:10px 0;">${childrenHtml}</ul>`;
      case "numbered-list":
        return `<ol style="padding-left:20px;margin:10px 0;">${childrenHtml}</ol>`;
      case "list-item":
        return `<li style="margin:4px 0;">${childrenHtml}</li>`;
      case "block-quote":
        return `<blockquote style="border-left:4px solid #2563eb;padding-left:12px;margin:12px 0;color:#4b5563;">${childrenHtml}</blockquote>`;
      case "link": {
        const safeHref =
          node.url && /^https?:\/\//i.test(node.url) ? escapeHtml(node.url) : "#";
        return `<a href="${safeHref}" style="color:#2563eb;text-decoration:underline;">${childrenHtml}</a>`;
      }
      default:
        return `<p style="margin:0 0 12px;line-height:1.6;">${childrenHtml || "&nbsp;"}</p>`;
    }
  };

  return (nodes as SlateNodeLike[]).map(renderNode).join("");
}

export function getNewsletterConfirmUrl(token: string): string {
  return `${getBaseUrl()}/newsletter/confirmar/${token}`;
}

export function getNewsletterUnsubscribeUrl(token: string): string {
  return `${getBaseUrl()}/newsletter/baja/${token}`;
}

export function getNewsletterConfirmationTemplate(
  nombre: string | null,
  confirmUrl: string,
): EmailTemplate {
  const saludo = nombre?.trim() ? `Hola ${nombre.trim()},` : "Hola,";
  const sSaludo = escapeHtml(saludo);
  const safeUrl = /^https?:\/\//.test(confirmUrl) ? confirmUrl : "#";
  const sUrl = escapeHtml(safeUrl);

  return {
    subject: "Confirma tu suscripción al Newsletter — CIEPI",
    text: `${saludo}

Gracias por solicitar tu suscripción al boletín informativo del Centro de Innovación y Emprendimiento Productivo (CIEPI - INADEH).

Para confirmar tu correo y activar tu suscripción, abre el siguiente enlace y pulsa "Confirmar suscripción" (válido por 24 horas):
${safeUrl}

Si no solicitaste esta suscripción, puedes ignorar este mensaje.`,
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;background-color:#f3f4f6;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:24px;text-align:center;color:#ffffff;">
      <h1 style="margin:0;font-size:22px;">CIEPI &mdash; INADEH</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">Centro de Innovación y Emprendimiento Productivo</p>
    </div>
    <div style="padding:28px;">
      <p style="margin-top:0;">${sSaludo}</p>
      <p>Gracias por suscribirte al boletín informativo de <strong>CIEPI</strong>. Para completar tu registro conforme a nuestra Política de Privacidad (Ley 81 de 2019), por favor confirma tu correo electrónico:</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${sUrl}" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:9999px;font-weight:bold;">Confirmar suscripción</a>
      </div>
      <p style="font-size:13px;color:#6b7280;">Este enlace expirará en 24 horas. Si no solicitaste esta suscripción, ignora este correo.</p>
    </div>
  </div>
</body>
</html>`,
  };
}

export function getNewsletterBroadcastTemplate(
  asunto: string,
  contenidoHtml: string,
  unsubscribeUrl: string,
): EmailTemplate {
  const sAsunto = escapeHtml(asunto);
  const safeUnsubUrl = /^https?:\/\//.test(unsubscribeUrl) ? unsubscribeUrl : "#";
  const sUnsubUrl = escapeHtml(safeUnsubUrl);
  const privacyUrl = escapeHtml(`${getBaseUrl()}/privacidad`);
  const cleanHtml = sanitizeNewsletterHtml(contenidoHtml);

  return {
    subject: asunto,
    text: `${asunto}\n\nPara ver este boletín correctamente usa un cliente compatible con HTML.\n\nCancelar suscripción: ${safeUnsubUrl}`,
    html: `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;background-color:#f3f4f6;margin:0;padding:24px;">
  <div style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:24px;text-align:center;color:#ffffff;">
      <h1 style="margin:0;font-size:20px;">${sAsunto}</h1>
      <p style="margin:6px 0 0;font-size:12px;opacity:0.9;">CIEPI &mdash; INADEH, República de Panamá</p>
    </div>
    <div style="padding:28px;font-size:15px;color:#374151;">
      ${cleanHtml}
    </div>
    <div style="background:#f9fafb;padding:18px 28px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
      <p style="margin:0 0 6px;">Recibes este correo porque te suscribiste al boletín de CIEPI.</p>
      <p style="margin:0;">
        <a href="${sUnsubUrl}" style="color:#2563eb;text-decoration:underline;">Darse de baja</a>
        &nbsp;&middot;&nbsp;
        <a href="${privacyUrl}" style="color:#2563eb;text-decoration:underline;">Política de Privacidad</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  };
}
