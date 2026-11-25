import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación y permisos de admin
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const directory = (formData.get("directory") as string) || "general";

    // Validate directory against allowlist to prevent path traversal
    const ALLOWED_DIRECTORIES = ["banners", "blogs", "attachments", "general"];
    if (!ALLOWED_DIRECTORIES.includes(directory)) {
      return NextResponse.json(
        { error: "Directorio no permitido" },
        { status: 400 }
      );
    }

    if (!file) {
      return NextResponse.json(
        { error: "No se encontró archivo para subir" },
        { status: 400 }
      );
    }

    // Validar tipo de archivo (solo imágenes)
    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Solo se permiten archivos de imagen" },
        { status: 400 }
      );
    }

    // Validate file extension against allowlist
    const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp"];
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: "Tipo de archivo no permitido. Solo se permiten: jpg, jpeg, png, gif, webp" },
        { status: 400 }
      );
    }

    // Validar tamaño del archivo (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "El archivo es demasiado grande. Máximo 5MB." },
        { status: 400 }
      );
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${sanitizedName}`;

    // Crear directorio si no existe
    const uploadDir = join(process.cwd(), "public", "uploads", directory);
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Guardar archivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const filepath = join(uploadDir, filename);

    await writeFile(filepath, buffer);

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
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
