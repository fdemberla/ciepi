/**
 * Utilidades para generar URLs de verificación
 */

/**
 * Obtiene la URL base de la aplicación
 */
export function getBaseUrl(): string {
  // En producción, usar la URL del entorno
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
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
  // Intentar obtener la IP de varios headers posibles
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  if (forwarded) {
    // x-forwarded-for puede contener múltiples IPs, tomar la primera
    return forwarded.split(",")[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  return null;
}
