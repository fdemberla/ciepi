import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { requireAdmin, requireArea, type AreaAdmin } from "@/lib/adminAuth";
import { safeErrorDetail } from "@/lib/apiError";
import {
  ArchivoNoValidoError,
  EXTENSIONES_IMAGEN,
  MAX_IMAGEN_BYTES,
  nombreSeguro,
  validarArchivo,
} from "@/lib/fileUpload";

/**
 * Carpetas permitidas y el área cuyo permiso de modificación exige cada una
 * (blog → contenido, fotos de mentores → mentorías, banners/adjuntos → capacitaciones).
 */
const AREA_POR_DIRECTORIO: Record<string, AreaAdmin> = {
  banners: "capacitaciones",
  attachments: "capacitaciones",
  blogs: "contenido",
  general: "contenido",
  mentores: "mentorias",
};

/**
 * Sube una imagen a public/uploads/<directory>.
 * Solo imágenes (jpg, jpeg, png, gif, webp) de hasta 10 MB; se comprueba extensión,
 * MIME y firma del contenido (ver lib/fileUpload.ts).
 */
export async function POST(request: NextRequest) {
  try {
    // Sesión de admin antes de leer el cuerpo; el permiso por área va después
    // porque depende de la carpeta.
    const noAdmin = await requireAdmin();
    if (noAdmin) return noAdmin;

    // Rechaza cuerpos enormes sin leerlos (margen de 1 MB para el multipart).
    const longitud = Number(request.headers.get("content-length") || 0);
    if (longitud > MAX_IMAGEN_BYTES + 1024 * 1024) {
      return NextResponse.json(
        { error: "El archivo es demasiado grande. Máximo 10 MB." },
        { status: 413 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const directory = (formData.get("directory") as string) || "general";

    // Lista cerrada de carpetas: evita path traversal.
    const area = AREA_POR_DIRECTORIO[directory];
    if (!area) {
      return NextResponse.json({ error: "Directorio no permitido" }, { status: 400 });
    }

    const auth = await requireArea(area);
    if (!auth.ok) return auth.respuesta;

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "No se encontró archivo para subir" },
        { status: 400 }
      );
    }

    let buffer: Buffer;
    try {
      ({ buffer } = await validarArchivo(file, EXTENSIONES_IMAGEN));
    } catch (error) {
      if (error instanceof ArchivoNoValidoError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    const filename = `${Date.now()}-${nombreSeguro(file.name)}`;

    const uploadDir = join(process.cwd(), "public", "uploads", directory);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }
    await writeFile(join(uploadDir, filename), buffer);

    // Ruta pública SIN basePath: es lo que se guarda en la BD. Al mostrarla se
    // usa assetUrl(), que agrega el basePath vigente.
    const publicUrl = `/uploads/${directory}/${filename}`;

    return NextResponse.json({
      success: true,
      message: "Archivo subido exitosamente",
      url: publicUrl,
      filename,
    });
  } catch (error) {
    console.error("Error subiendo archivo:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al subir archivo",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
