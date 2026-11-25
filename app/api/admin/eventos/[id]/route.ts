import { NextRequest, NextResponse } from "next/server";
import { ArchivoNoValidoError } from "@/lib/fileUpload";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { parseId, requireAdmin, requireArea } from "@/lib/adminAuth";
import { validarFechasEvento } from "@/lib/eventoEstado";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string = "";
  try {
    const noAutorizado = await requireAdmin();
    if (noAutorizado) return noAutorizado;

    const resolvedParams = await params;
    id = resolvedParams.id;
    if (parseId(id) === null) {
      return NextResponse.json(
        { success: false, error: "ID de evento no válido" },
        { status: 400 }
      );
    }

    console.log(`🔍 [GET /api/admin/eventos/${id}] Fetching evento`);

    const queryText = `
      SELECT 
        id,
        nombre,
        descripcion,
        fecha_inicio,
        fecha_fin,
        ubicacion,
        banner,
        galeria,
        fecha_creacion,
        fecha_actualizacion
      FROM ciepi.eventos
      WHERE id = $1
    `;

    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      console.log(`❌ Evento ${id} not found`);
      return NextResponse.json(
        { success: false, error: "Evento no encontrado" },
        { status: 404 }
      );
    }

    console.log(`✅ Evento ${id} found:`, result.rows[0].nombre);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error(`❌ [GET /api/admin/eventos/${id}] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener evento",
        message: safeErrorDetail(error),
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
    // Modificar eventos requiere un rol del área "contenido" (leído de la BD).
    const auth = await requireArea("contenido");
    if (!auth.ok) return auth.respuesta;

    const resolvedParams = await params;
    id = resolvedParams.id;
    if (parseId(id) === null) {
      return NextResponse.json(
        { success: false, error: "ID de evento no válido" },
        { status: 400 }
      );
    }
    const formData = await request.formData();

    console.log(`🔍 [PUT /api/admin/eventos/${id}] Processing update`);

    // Extract and validate required fields
    const nombre = formData.get("nombre") as string;
    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    // Fechas: inicio obligatorio, fin >= inicio
    const fechas = validarFechasEvento(
      formData.get("fecha_inicio"),
      formData.get("fecha_fin")
    );
    if (!fechas.ok) {
      return NextResponse.json(
        { success: false, error: fechas.error },
        { status: 400 }
      );
    }

    // First, get the existing evento to preserve old file paths if no new files uploaded
    const existingResult = await query(
      "SELECT banner FROM ciepi.eventos WHERE id = $1",
      [id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Evento no encontrado" },
        { status: 404 }
      );
    }

    const existingData = existingResult.rows[0];

    // Extract files
    const bannerFile = formData.get("banner") as File | null;

    console.log("📁 Files received:", {
      banner: bannerFile?.name,
    });

    // Use existing path or save new file
    let bannerPath: string | null = existingData.banner;

    // Only update banner if a new file was uploaded
    if (bannerFile && bannerFile.size > 0) {
      const { saveFile } = await import("@/lib/fileUpload");
      bannerPath = await saveFile(bannerFile, "banners");
      console.log("✅ New banner saved:", bannerPath);
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

    const { fecha_inicio, fecha_fin } = fechas;
    const ubicacion = (formData.get("ubicacion") as string) || null;

    // Update in database
    const updateQuery = `
      UPDATE ciepi.eventos
      SET 
        nombre = $1,
        descripcion = $2,
        fecha_inicio = $3,
        fecha_fin = $4,
        ubicacion = $5,
        banner = $6,
        fecha_actualizacion = NOW()
      WHERE id = $7
      RETURNING *
    `;

    const values = [
      nombre,
      descripcion ? JSON.stringify(descripcion) : null,
      fecha_inicio,
      fecha_fin,
      ubicacion,
      bannerPath,
      id,
    ];

    console.log("📊 Executing UPDATE query");

    const result = await query(updateQuery, values);

    console.log(`✅ Evento ${id} updated successfully`);

    return NextResponse.json({
      success: true,
      message: "Evento actualizado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error(`❌ [PUT /api/admin/eventos/${id}] Error:`, error);
    if (error instanceof ArchivoNoValidoError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar evento",
        message: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string = "";
  try {
    // Modificar eventos requiere un rol del área "contenido" (leído de la BD).
    const auth = await requireArea("contenido");
    if (!auth.ok) return auth.respuesta;

    const resolvedParams = await params;
    id = resolvedParams.id;
    if (parseId(id) === null) {
      return NextResponse.json(
        { success: false, error: "ID de evento no válido" },
        { status: 400 }
      );
    }

    console.log(`🔍 [DELETE /api/admin/eventos/${id}] Processing delete`);

    // Delete from database
    const deleteQuery = `
      DELETE FROM ciepi.eventos
      WHERE id = $1
      RETURNING id
    `;

    const result = await query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Evento no encontrado" },
        { status: 404 }
      );
    }

    console.log(`✅ Evento ${id} deleted successfully`);

    return NextResponse.json({
      success: true,
      message: "Evento eliminado exitosamente",
    });
  } catch (error) {
    console.error(`❌ [DELETE /api/admin/eventos/${id}] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Error al eliminar evento",
        message: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
