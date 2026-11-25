/**
 * Utilidad servidor para verificar tokens de Cloudflare Turnstile.
 * Si TURNSTILE_SECRET_KEY no está configurada, omite la verificación (modo desarrollo/sin Turnstile).
 */
export function isTurnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY?.trim());
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
  remoteIp?: string | null,
): Promise<{ success: boolean; skipped?: boolean; error?: string }> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return { success: true, skipped: true };
  }

  if (!token || !token.trim()) {
    return {
      success: false,
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
        error: "Verificación de seguridad inválida o expirada. Intenta de nuevo.",
      };
    }

    return { success: true };
  } catch (err) {
    console.error("[Turnstile] Error verificando token:", err);
    return {
      success: false,
      error: "No se pudo validar la verificación de seguridad.",
    };
  }
}
