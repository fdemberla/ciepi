import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string = "";
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;

    console.log(
      `🔍 [GET /api/admin/capacitaciones/${id}] Fetching capacitacion`
    );

    const queryText = `
      SELECT 
        id,
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
        activo,
        fecha_creacion,
        fecha_actualizacion
      FROM ciepi.capacitaciones
      WHERE id = $1
    `;

    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      console.log(`❌ Capacitacion ${id} not found`);
      return NextResponse.json(
        { success: false, error: "Capacitación no encontrada" },
        { status: 404 }
      );
    }

    console.log(`✅ Capacitacion ${id} found:`, result.rows[0].nombre);

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`❌ [GET /api/admin/capacitaciones/${id}] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener capacitación",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string = "";
  try {
    const resolvedParams = await params;
    id = resolvedParams.id;
    const formData = await request.formData();

    console.log(`🔍 [PUT /api/admin/capacitaciones/${id}] Processing update`);

    // Extract and validate required fields
    const nombre = formData.get("nombre") as string;
    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    // First, get the existing capacitacion to preserve old file paths if no new files uploaded
    const existingResult = await query(
      "SELECT banner, archivo_adjunto FROM ciepi.capacitaciones WHERE id = $1",
      [id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Capacitación no encontrada" },
        { status: 404 }
      );
    }

    const existingData = existingResult.rows[0];

    // Extract files
    const bannerFile = formData.get("Banner") as File | null;
    const archivoAdjuntoFile = formData.get("archivoAdjunto") as File | null;

    console.log("📁 Files received:", {
      banner: bannerFile?.name,
      adjunto: archivoAdjuntoFile?.name,
    });

    // Use existing paths or save new files
    let bannerPath: string | null = existingData.banner;
    let archivoAdjuntoPath: string | null = existingData.archivo_adjunto;

    // Only update banner if a new file was uploaded
    if (bannerFile && bannerFile.size > 0) {
      const { saveFile } = await import("@/lib/fileUpload");
      bannerPath = await saveFile(bannerFile, "banners");
      console.log("✅ New banner saved:", bannerPath);
    }

    // Only update attachment if a new file was uploaded
    if (archivoAdjuntoFile && archivoAdjuntoFile.size > 0) {
      const { saveFile } = await import("@/lib/fileUpload");
      archivoAdjuntoPath = await saveFile(archivoAdjuntoFile, "attachments");
      console.log("✅ New attachment saved:", archivoAdjuntoPath);
    }

    // Extract other fields
    const descripcionStr = formData.get("descripcion") as string;
    let descripcion = null;

    if (descripcionStr) {
      try {
        descripcion = JSON.parse(descripcionStr);
      } catch {
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

    // Get activo status (default to existing or true)
    const activoStr = formData.get("activo") as string;
    const activo = activoStr ? activoStr === "true" || activoStr === "1" : true;

    // Update in database
    const updateQuery = `
      UPDATE ciepi.capacitaciones
      SET 
        banner = $1,
        nombre = $2,
        descripcion = $3,
        cantidad_horas = $4,
        cantidad_participantes = $5,
        archivo_adjunto = $6,
        fecha_inicio_inscripcion = $7,
        fecha_final_inscripcion = $8,
        fecha_inicio_capacitacion = $9,
        fecha_final_capacitacion = $10,
        activo = $11,
        fecha_actualizacion = NOW()
      WHERE id = $12
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
      activo,
      id,
    ];

    console.log("📊 Executing UPDATE query");

    const result = await query(updateQuery, values);

    console.log(`✅ Capacitación ${id} updated successfully`);

    return NextResponse.json(
      {
        success: true,
        message: "Capacitación actualizada exitosamente",
        data: result.rows[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`❌ [PUT /api/admin/capacitaciones/${id}] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar capacitación",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
