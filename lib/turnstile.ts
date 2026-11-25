/**
 * Utilidad servidor para verificar tokens de Cloudflare Turnstile.
 * Política (ver lib/captchaPolicy.ts): con TURNSTILE_SECRET_KEY el token es obligatorio;
 * sin la clave, en producción se rechaza (503) y en desarrollo se omite con un aviso.
 */
import { resultadoSinClave, MENSAJE_CAPTCHA_NO_DISPONIBLE, type ResultadoCaptcha } from "@/lib/captchaPolicy";

export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<ResultadoCaptcha> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return resultadoSinClave("Turnstile", "TURNSTILE_SECRET_KEY");
  }

  if (typeof token !== "string" || !token.trim()) {
    return {
      success: false,
      status: 403,
      error: "Completa la verificación de seguridad (Turnstile) para continuar.",
    };
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token.trim(),
    });
    if (remoteIp) {
      body.set("remoteip", remoteIp);
    }

    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      },
    );

    const data = (await res.json()) as { success?: boolean };
    if (!data.success) {
      return {
        success: false,
        status: 403,
        error: "Verificación de seguridad inválida o expirada. Intenta de nuevo.",
      };
    }

    return { success: true };
  } catch (err) {
    console.error("[Turnstile] Error verificando token:", err);
    return {
      success: false,
      status: 503,
      error: MENSAJE_CAPTCHA_NO_DISPONIBLE,
    };
  }
}
