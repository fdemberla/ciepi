import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

/**
 * Sirve los archivos que se suben mientras la app está en marcha
 * (banners, adjuntos y /uploads).
 *
 * En producción (`next start`), Next.js solo sirve los archivos que existían en
 * public/ al ejecutar `next build`: lo subido después queda en disco pero
 * responde 404. next.config.ts redirige internamente (rewrite "fallback") las
 * rutas /banners, /attachments y /uploads a esta ruta solo cuando Next no
 * encuentra el archivo, así que las URL guardadas en la BD no cambian.
 */
const CARPETAS = new Set(["banners", "attachments", "uploads"]);
const TIPOS: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};
const SEGMENTO = /^[A-Za-z0-9._()-]+$/;
const PUBLIC = path.join(process.cwd(), "public");

export async function GET(_request: NextRequest, { params }: { params: Promise<{ ruta: string[] }> }) {
  const ruta = (await params).ruta ?? [];
  const noEncontrado = () => new NextResponse("No encontrado", { status: 404 });

  if (ruta.length < 2 || !CARPETAS.has(ruta[0])) return noEncontrado();
  if (ruta.some((s) => !SEGMENTO.test(s) || s === "." || s === "..")) return noEncontrado();
  const ext = ruta[ruta.length - 1].split(".").pop()?.toLowerCase() ?? "";
  const tipo = TIPOS[ext];
  if (!tipo) return noEncontrado();

  const archivo = path.resolve(PUBLIC, ...ruta);
  if (!archivo.startsWith(PUBLIC + path.sep)) return noEncontrado();

  try {
    const info = await stat(archivo);
    if (!info.isFile()) return noEncontrado();
    const datos = await readFile(archivo);
    const esDocumento = ext === "doc" || ext === "docx";
    return new NextResponse(new Uint8Array(datos), {
      headers: {
        "Content-Type": tipo,
        "Content-Length": String(info.size),
        // Los nombres llevan marca de tiempo: el contenido de una URL nunca cambia.
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": `${esDocumento ? "attachment" : "inline"}; filename="${ruta[ruta.length - 1]}"`,
      },
    });
  } catch {
    return noEncontrado();
  }
}
