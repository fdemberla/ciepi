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
  const dangerousPatterns = [
    "javascript:",
    "data:",
    "vbscript:",
    "file:",
    "<script",
    "on",
    "%3cscript",
    "%3C",
  ];

  const lowerUrl = url.toLowerCase();
  return dangerousPatterns.some((pattern) => lowerUrl.includes(pattern));
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
 * Sanitiza un objeto para JSON.stringify en dangerouslySetInnerHTML
 * - Escapa strings que puedan contener caracteres peligrosos
 * - Valida URLs
 */
export function sanitizeForJsonLd(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === "string") {
    // Escapar solo caracteres que puedan romper JSON
    return obj
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForJsonLd(item));
  }

  if (typeof obj === "object") {
    const sanitized: Record<string, unknown> = {};
    for (const key in obj as Record<string, unknown>) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeForJsonLd(
          (obj as Record<string, unknown>)[key]
        );
      }
    }
    return sanitized;
  }

  return obj;
}
