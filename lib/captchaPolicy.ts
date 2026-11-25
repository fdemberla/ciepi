/**
 * Política común de los captcha (Cloudflare Turnstile y Google reCAPTCHA):
 * - Con la clave secreta configurada, el token es OBLIGATORIO.
 * - Sin la clave en producción (NODE_ENV=production) se falla de forma cerrada (503):
 *   olvidar la variable no puede dejar los formularios públicos sin protección.
 * - Sin la clave fuera de producción se permite, con un aviso en el log.
 */
export interface ResultadoCaptcha {
  success: boolean;
  /** true si no se verificó porque falta la clave (solo fuera de producción). */
  skipped?: boolean;
  error?: string;
  /** Código HTTP sugerido cuando success es false. */
  status?: number;
  /** Puntuación de reCAPTCHA v3, si la hay. */
  score?: number;
}

export const MENSAJE_CAPTCHA_NO_DISPONIBLE =
  "La verificación de seguridad no está disponible en este momento. Intenta de nuevo más tarde.";

/** Resultado cuando falta la clave secreta del proveedor indicado. */
export function resultadoSinClave(proveedor: string, variable: string): ResultadoCaptcha {
  if (process.env.NODE_ENV === "production") {
    console.error(
      `[${proveedor}] ${variable} no está configurada en producción: se rechazan los envíos hasta configurarla.`,
    );
    return { success: false, status: 503, error: MENSAJE_CAPTCHA_NO_DISPONIBLE };
  }
  console.warn(`[${proveedor}] ${variable} no está configurada: se omite la verificación (solo fuera de producción).`);
  return { success: true, skipped: true };
}
