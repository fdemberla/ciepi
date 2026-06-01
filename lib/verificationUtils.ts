/**
 * Utilidades para generar URLs de verificación
 */

/**
 * Obtiene la URL base de la aplicación
 */
export function getBaseUrl(): string {
  // En producción, usar la URL del entorno
  if (process.env.NEXT_PUBLIC_APP_URL) {
    const url = process.env.NEXT_PUBLIC_APP_URL;
    // Enforce HTTPS in production to prevent mixed-content and mitm
    if (process.env.NODE_ENV === "production" && !url.startsWith("https://")) {
      throw new Error("NEXT_PUBLIC_APP_URL must use HTTPS in production");
    }
    return url;
  }

  // En desarrollo, usar localhost
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  return `http://localhost:3000${basePath}`;
}

/**
 * Genera la URL de verificación de correo
 * @param token Token de verificación
 * @returns URL completa para verificar el correo
 */
export function getVerificationUrl(token: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/verificacion/${token}`;
}

/**
 * Genera la URL de la página de espera de verificación
 * @param token Token de verificación
 * @returns URL completa de la página de espera
 */
export function getWaitingUrl(token: string): string {
  const baseUrl = getBaseUrl();
  return `${baseUrl}/verificacion/esperando/${token}`;
}

/**
 * Obtiene la IP del cliente desde la request
 * @param request Request de Next.js
 * @returns IP del cliente o null
 */
export function getClientIp(request: Request): string | null {
  // Cloudflare sets cf-connecting-ip to the real client IP — trust it first
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) {
    return cfConnectingIp.trim();
  }

  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for: client, proxy1, proxy2 — the LAST entry is added by our
    // trusted reverse proxy; use it to prevent client-side spoofing.
    const ips = forwarded.split(",").map((ip) => ip.trim());
    return ips[ips.length - 1];
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return null;
}
