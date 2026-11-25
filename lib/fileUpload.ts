import { writeFile, mkdir, unlink } from "fs/promises";
import path from "path";

export interface UploadedFile {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

const MB = 1024 * 1024;

/**
 * Límites de subida (decisión de la fase 3):
 *   - Imágenes (banners, fotos, imágenes del blog): 10 MB.
 *   - Documentos adjuntos (pdf, doc, docx): 20 MB.
 * El tipo se comprueba por extensión, por el MIME que envía el navegador y por la
 * firma real del archivo (primeros bytes), porque el MIME y el nombre los controla el cliente.
 */
export const MAX_IMAGEN_BYTES = 10 * MB;
export const MAX_DOCUMENTO_BYTES = 20 * MB;

export const EXTENSIONES_IMAGEN = ["jpg", "jpeg", "png", "gif", "webp"] as const;
export const EXTENSIONES_DOCUMENTO = ["pdf", "doc", "docx"] as const;

/** MIME aceptados por extensión. "" y application/octet-stream se tratan como "desconocido". */
const MIME_POR_EXTENSION: Record<string, string[]> = {
  jpg: ["image/jpeg", "image/pjpeg"],
  jpeg: ["image/jpeg", "image/pjpeg"],
  png: ["image/png"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  pdf: ["application/pdf"],
  doc: ["application/msword"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
  ],
};

export type CarpetaArchivo = "banners" | "attachments";

/** Qué acepta cada carpeta de saveFile. */
const POLITICA_CARPETA: Record<CarpetaArchivo, { extensiones: readonly string[] }> = {
  banners: { extensiones: EXTENSIONES_IMAGEN },
  // Los adjuntos admiten documentos y también imágenes (p. ej. un afiche).
  attachments: { extensiones: [...EXTENSIONES_DOCUMENTO, ...EXTENSIONES_IMAGEN] },
};

/** Error de validación de un archivo: las rutas lo convierten en 400 con este mensaje. */
export class ArchivoNoValidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArchivoNoValidoError";
  }
}

export function extensionDe(nombre: string): string {
  const partes = nombre.split(".");
  return partes.length > 1 ? (partes.pop() ?? "").toLowerCase() : "";
}

export function tamanoMaximo(ext: string): number {
  return (EXTENSIONES_DOCUMENTO as readonly string[]).includes(ext)
    ? MAX_DOCUMENTO_BYTES
    : MAX_IMAGEN_BYTES;
}

/**
 * Validación que no necesita leer el archivo: extensión permitida, tamaño máximo y
 * MIME coherente con la extensión. Lanza ArchivoNoValidoError.
 */
export function validarArchivoBasico(
  file: { name: string; size: number; type: string },
  extensionesPermitidas: readonly string[],
): string {
  const ext = extensionDe(file.name);
  if (!extensionesPermitidas.includes(ext)) {
    throw new ArchivoNoValidoError(
      `Tipo de archivo no permitido${ext ? `: .${ext}` : ""}. Se permiten: ${extensionesPermitidas.join(", ")}.`,
    );
  }
  const max = tamanoMaximo(ext);
  if (file.size > max) {
    throw new ArchivoNoValidoError(
      `El archivo «${file.name}» es demasiado grande. Máximo ${Math.round(max / MB)} MB.`,
    );
  }
  const mime = (file.type || "").toLowerCase();
  if (mime && mime !== "application/octet-stream" && !MIME_POR_EXTENSION[ext]?.includes(mime)) {
    throw new ArchivoNoValidoError(
      `El archivo «${file.name}» no coincide con su extensión (.${ext}).`,
    );
  }
  return ext;
}

function empiezaCon(buf: Uint8Array, firma: number[], desde = 0): boolean {
  if (buf.length < desde + firma.length) return false;
  return firma.every((b, i) => buf[desde + i] === b);
}

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

/** Comprueba la firma (magic bytes) del contenido según la extensión. */
export function firmaCoincide(ext: string, buf: Uint8Array): boolean {
  switch (ext) {
    case "jpg":
    case "jpeg":
      return empiezaCon(buf, [0xff, 0xd8, 0xff]);
    case "png":
      return empiezaCon(buf, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    case "gif":
      return empiezaCon(buf, ascii("GIF87a")) || empiezaCon(buf, ascii("GIF89a"));
    case "webp":
      return empiezaCon(buf, ascii("RIFF")) && empiezaCon(buf, ascii("WEBP"), 8);
    case "pdf":
      return empiezaCon(buf, ascii("%PDF-"));
    case "doc":
      return empiezaCon(buf, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
    case "docx":
      return empiezaCon(buf, [0x50, 0x4b, 0x03, 0x04]);
    default:
      return false;
  }
}

/**
 * Validación completa (extensión, tamaño, MIME y firma). Se usa ANTES de escribir en
 * la base de datos para responder 400 sin dejar nada a medias.
 */
export async function validarArchivo(
  file: File,
  extensionesPermitidas: readonly string[],
): Promise<{ ext: string; buffer: Buffer }> {
  const ext = validarArchivoBasico(file, extensionesPermitidas);
  const buffer = Buffer.from(await file.arrayBuffer());
  if (!firmaCoincide(ext, buffer)) {
    throw new ArchivoNoValidoError(
      `El contenido de «${file.name}» no corresponde a un archivo .${ext} válido.`,
    );
  }
  return { ext, buffer };
}

/** Nombre de archivo seguro: solo [A-Za-z0-9.-_] y sin "..". */
export function nombreSeguro(nombre: string): string {
  return nombre
    .replace(/[^a-zA-Z0-9.-]/g, "_") // caracteres inseguros
    .replace(/\.{2,}/g, "_"); // sin ".." (evita rutas con traversal)
}

/** Valida un archivo según la carpeta de saveFile (sin guardarlo). */
export async function validarArchivoParaCarpeta(file: File, folder: CarpetaArchivo) {
  return validarArchivo(file, POLITICA_CARPETA[folder].extensiones);
}

/**
 * Guarda un archivo en public/<folder> tras validarlo (extensión, tamaño, MIME y firma).
 * Lanza ArchivoNoValidoError si el archivo no es aceptable.
 * @returns ruta relativa para guardar en la BD (p. ej. /banners/123-foto.jpg)
 */
export async function saveFile(file: File, folder: CarpetaArchivo): Promise<string> {
  const { buffer } = await validarArchivoParaCarpeta(file, folder);
  try {
    const filename = `${Date.now()}-${nombreSeguro(file.name)}`;
    const uploadDir = path.join(process.cwd(), "public", folder);
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), buffer);
    return `/${folder}/${filename}`;
  } catch (error) {
    console.error(`Error guardando archivo en ${folder}:`, error);
    throw new Error("No se pudo guardar el archivo.");
  }
}

/**
 * Borra (sin lanzar) un archivo guardado por saveFile. Se usa para no dejar archivos
 * huérfanos cuando la transacción posterior falla.
 */
export async function deleteSavedFile(rutaRelativa: string | null | undefined): Promise<void> {
  if (!rutaRelativa || !/^\/(banners|attachments)\/[A-Za-z0-9._-]+$/.test(rutaRelativa)) return;
  try {
    await unlink(path.join(process.cwd(), "public", rutaRelativa.slice(1)));
  } catch {
    // Puede no existir: no es un error.
  }
}
