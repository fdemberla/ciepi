import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { saveFile } from "@/lib/fileUpload";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    console.log("🔍 [POST /api/admin/capacitaciones/crear] Processing request");

    // Extract and validate required fields
    const nombre = formData.get("nombre") as string;
    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    // Extract files
    const bannerFile = formData.get("Banner") as File | null;
    const archivoAdjuntoFile = formData.get("archivoAdjunto") as File | null;

    console.log("📁 Files received:", {
      banner: bannerFile?.name,
      adjunto: archivoAdjuntoFile?.name,
    });

    // Save files to public directory
    let bannerPath: string | null = null;
    let archivoAdjuntoPath: string | null = null;

    if (bannerFile && bannerFile.size > 0) {
      bannerPath = await saveFile(bannerFile, "banners");
      console.log("✅ Banner saved:", bannerPath);
    }

    if (archivoAdjuntoFile && archivoAdjuntoFile.size > 0) {
      archivoAdjuntoPath = await saveFile(archivoAdjuntoFile, "attachments");
      console.log("✅ Attachment saved:", archivoAdjuntoPath);
    }

    // Extract other fields
    const descripcionStr = formData.get("descripcion") as string;
    let descripcion = null;

    if (descripcionStr) {
      try {
        // Try to parse if it's a JSON string
        descripcion = JSON.parse(descripcionStr);
      } catch {
        // If parsing fails, it might already be an object or invalid
        // In case it's already an object (shouldn't happen with FormData, but just in case)
        descripcion = descripcionStr;
      }
    }

    const cantidadHoras = formData.get("cantidadHoras")
      ? parseInt(formData.get("cantidadHoras") as string)
      : null;

    const cantidadParticipantes = formData.get("cantidad_participantes")
      ? parseInt(formData.get("cantidad_participantes") as string)
      : null;

    const fechaInicioInscripcion =
      (formData.get("fechaInicioInscripcion") as string) || null;
    const fechaFinalInscripcion =
      (formData.get("fechaFinalInscripcion") as string) || null;
    const fechaInicioCapacitacion =
      (formData.get("fechaInicioCapacitacion") as string) || null;
    const fechaFinalCapacitacion =
      (formData.get("fechaFinalCapacitacion") as string) || null;

    // Insert into database
    const insertQuery = `
      INSERT INTO ciepi.capacitaciones (
        banner,
        nombre,
        descripcion,
        cantidad_horas,
        cantidad_participantes,
        archivo_adjunto,
        fecha_inicio_inscripcion,
        fecha_final_inscripcion,
        fecha_inicio_capacitacion,
        fecha_final_capacitacion,
        activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      bannerPath,
      nombre,
      descripcion ? JSON.stringify(descripcion) : null,
      cantidadHoras,
      cantidadParticipantes,
      archivoAdjuntoPath,
      fechaInicioInscripcion,
      fechaFinalInscripcion,
      fechaInicioCapacitacion,
      fechaFinalCapacitacion,
      true, // activo by default
    ];

    console.log("📊 Executing INSERT query");

    const result = await query(insertQuery, values);

    console.log("✅ Capacitación created successfully:", result.rows[0].id);

    return NextResponse.json(
      {
        success: true,
        message: "Capacitación creada exitosamente",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ [POST /api/admin/capacitaciones/crear] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Error al crear capacitación",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
