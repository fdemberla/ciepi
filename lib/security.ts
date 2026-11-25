/**
 * Sanitización y validación segura de URLs y datos
 */

/**
 * Valida que una URL es segura (no contiene javascript: u otros protocolos peligrosos)
 */
export function isSafeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;

  try {
    // Permitir URLs relativas (comienzan con /)
    if (url.startsWith("/")) {
      return !containsDangerousPatterns(url);
    }

    // Permitir URLs que comienzan con http:// o https://
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return !containsDangerousPatterns(url);
    }

    // Denegar cualquier otro protocolo
    return false;
  } catch {
    return false;
  }
}

/**
 * Verifica si una URL contiene patrones peligrosos
 */
function containsDangerousPatterns(url: string): boolean {
  const dangerousPatterns: RegExp[] = [
    /javascript:/,
    /data:/,
    /vbscript:/,
    /file:/,
    /<script/,
    /%3cscript/,
    // Manejadores de eventos (onclick=, onerror=...). Antes era el texto "on"
    // a secas, que bloqueaba rutas legítimas como "/attachments/informacion.pdf".
    /\bon[a-z]+\s*=/,
    /["'<>]/,
  ];

  const lowerUrl = url.toLowerCase();
  return dangerousPatterns.some((pattern) => pattern.test(lowerUrl));
}

/**
 * Sanitiza una URL para usarla en href
 * Solo permite URLs relativas o http(s)
 * @param basePath La ruta base del aplicativo
 * @param filePath La ruta del archivo
 * @returns URL segura o string vacío
 */
export function buildSafeFileUrl(
  basePath: string | undefined,
  filePath: string | null | undefined
): string {
  if (!filePath || typeof filePath !== "string") return "";

  // Validar que filePath es seguro
  if (containsDangerousPatterns(filePath)) {
    console.warn(`Potentially unsafe file path detected: ${filePath}`);
    return "";
  }

  // Construir URL solo con paths seguros
  const base = basePath || "";
  const fullUrl = `${base}${filePath}`;

  // Validar URL completa
  if (!isSafeUrl(fullUrl)) {
    console.warn(`Potentially unsafe URL built: ${fullUrl}`);
    return "";
  }

  return fullUrl;
}

/**
 * Escapa caracteres especiales para texto seguro
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return "";

  const map: { [key: string]: string } = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };

  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

/**
 * Serializa datos para un <script type="application/ld+json"> insertado con
 * dangerouslySetInnerHTML. JSON.stringify ya escapa comillas y barras; lo que
 * falta es impedir que el contenido cierre el <script> (`</script>`) o abra un
 * comentario HTML (`<!--`). Se escapan `<`, `>`, `&` y los separadores U+2028 /
 * U+2029 como secuencias \uXXXX, que siguen siendo JSON válido con el mismo valor.
 * (Sustituye a sanitizeForJsonLd, que escapaba las comillas dos veces y no
 * escapaba `<`.)
 */
export function serializeJsonLd(data: unknown): string {
  return (JSON.stringify(data) ?? "null")
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
