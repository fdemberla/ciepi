/**
 * Normaliza el basePath configurado en NEXT_PUBLIC_BASE_PATH.
 * Retorna "" cuando la aplicación se despliega en la raíz del dominio
 * (ej. ciepi.inadeh.edu.pa), o "/subruta" sin barra final cuando se usa subruta.
 */
export function getBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const trimmed = raw.trim().replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}` : "";
}

/**
 * Antepone el basePath configurado a una ruta interna de la aplicación.
 */
export function withBasePath(pathname: string): string {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getBasePath()}${normalizedPath}`;
}

/**
 * URL para mostrar un archivo guardado en la BD (banner, adjunto, imagen).
 * En la BD se guardan rutas SIN basePath ("/uploads/blogs/x.png"); el prefijo se
 * agrega al mostrar, así un cambio de basePath (p. ej. pasar de /ciepi a un
 * subdominio propio) no rompe archivos ya guardados. URLs absolutas pasan igual.
 */
export function assetUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return withBasePath(path);
}
