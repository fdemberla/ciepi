/**
 * Componente seguro para descargar archivos
 * Aísla la validación de URL del flujo de datos de useState
 */
import { Icon } from "@iconify/react";

interface FileDownloadProps {
  filePath: string | null | undefined;
  basePath: string | undefined;
  fileName: string;
  icon?: string;
}

// Función de validación pura - separada del componente
const isValidFilePath = (input: unknown): boolean => {
  if (typeof input !== "string") return false;
  if (!input || input.length === 0) return false;
  if (input.length > 500) return false;
  if (!input.startsWith("/")) return false;

  const lowerInput = input.toLowerCase();
  const dangerousPatterns = [
    "javascript:",
    "data:",
    "vbscript:",
    "file:",
    "<",
    ">",
    '"',
    "'",
    "%3c",
    "%3e",
    "onerror",
    "onclick",
    "onload",
    "%00",
    "\\x",
    "&lt;",
    "&gt;",
  ];

  return !dangerousPatterns.some((pattern) => lowerInput.includes(pattern));
};

// Función de construcción de URL - validada independientemente
const buildSafeUrl = (
  basePath: string | undefined,
  filePath: unknown
): string => {
  // Validar filePath de forma estricta
  if (!isValidFilePath(filePath)) {
    return "";
  }

  const path = String(filePath).trim();
  const base = String(basePath || "").trim();

  // Validar basePath
  if (base.length > 0) {
    const lowerBase = base.toLowerCase();
    if (
      lowerBase.includes("javascript:") ||
      lowerBase.includes("data:") ||
      base.includes("<") ||
      base.includes(">")
    ) {
      return "";
    }
  }

  const fullUrl = base + path;

  // Validación final
  if (!fullUrl.startsWith("/") && !fullUrl.startsWith("http")) {
    return "";
  }

  return fullUrl;
};

export function FileDownloadLink({
  filePath,
  basePath,
  fileName,
  icon = "solar:download-linear",
}: FileDownloadProps) {
  // Construir URL de forma segura - la validación ocurre aquí, no en el padre
  const safeUrl = buildSafeUrl(basePath, filePath);

  // No renderizar nada si la URL no es segura
  if (!safeUrl || safeUrl.length === 0) {
    return null;
  }

  return (
    <a
      href={safeUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center px-8 py-4 bg-slateGray dark:bg-gray-700 text-midnight_text dark:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl group"
    >
      <Icon
        icon={icon}
        className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform"
      />
      {fileName}
    </a>
  );
}
