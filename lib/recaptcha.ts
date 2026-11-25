/**
 * Utilidad servidor para verificar tokens de Google reCAPTCHA v3.
 * Política (ver lib/captchaPolicy.ts): con RECAPTCHA_SECRET_KEY el token es obligatorio;
 * sin la clave, en producción se rechaza (503) y en desarrollo se omite con un aviso.
 */
import { resultadoSinClave, MENSAJE_CAPTCHA_NO_DISPONIBLE, type ResultadoCaptcha } from "@/lib/captchaPolicy";

/** Puntuación mínima de reCAPTCHA v3 para aceptar el envío. */
export const RECAPTCHA_PUNTUACION_MINIMA = 0.5;

export function isRecaptchaEnabled(): boolean {
  return Boolean(process.env.RECAPTCHA_SECRET_KEY?.trim());
}

export async function verifyRecaptchaToken(
  token: string | null | undefined,
  opciones: { accion?: string; remoteIp?: string | null } = {},
): Promise<ResultadoCaptcha> {
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim();
  if (!secret) {
    return resultadoSinClave("reCAPTCHA", "RECAPTCHA_SECRET_KEY");
  }

  if (typeof token !== "string" || !token.trim()) {
    return {
      success: false,
      status: 400,
      error: "No se pudo completar la verificación de seguridad. Recarga la página e intenta de nuevo.",
    };
  }

  try {
    const body = new URLSearchParams({ secret, response: token.trim() });
    if (opciones.remoteIp) body.set("remoteip", opciones.remoteIp);

    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    const data = (await res.json()) as { success?: boolean; score?: number; action?: string };

    if (!data.success) {
      return { success: false, status: 400, error: "Verificación de seguridad fallida. Intenta de nuevo." };
    }
    if (opciones.accion && data.action && data.action !== opciones.accion) {
      console.warn(`[reCAPTCHA] Acción inesperada: "${data.action}" (se esperaba "${opciones.accion}").`);
      return { success: false, status: 400, error: "Verificación de seguridad fallida. Intenta de nuevo." };
    }
    const score = typeof data.score === "number" ? data.score : undefined;
    if (score !== undefined && score < RECAPTCHA_PUNTUACION_MINIMA) {
      return {
        success: false,
        status: 400,
        score,
        error: "Verificación de seguridad fallida. Por favor, intenta de nuevo más tarde.",
      };
    }
    return { success: true, score };
  } catch (err) {
    console.error("[reCAPTCHA] Error verificando token:", err);
    return { success: false, status: 503, error: MENSAJE_CAPTCHA_NO_DISPONIBLE };
  }
}
