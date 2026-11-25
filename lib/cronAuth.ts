import { timingSafeEqual } from "crypto";

/**
 * Verifica el secreto de las tareas programadas (cabecera "Authorization:
 * Bearer <secreto>"). Comparación en tiempo constante. Si no hay secreto
 * configurado, siempre rechaza: el endpoint queda deshabilitado.
 */
export function verificarSecretoCron(authorization: string | null, secreto: string | undefined): boolean {
  const esperado = secreto?.trim();
  if (!esperado || esperado.length < 24) return false;
  const m = /^Bearer\s+(.+)$/i.exec(authorization?.trim() ?? "");
  if (!m) return false;
  const a = Buffer.from(m[1].trim());
  const b = Buffer.from(esperado);
  return a.length === b.length && timingSafeEqual(a, b);
}
