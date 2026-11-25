import { NextRequest, NextResponse } from "next/server";
import { ArchivoNoValidoError } from "@/lib/fileUpload";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { requireAdmin, requireArea } from "@/lib/adminAuth";
import { validarFechasEvento } from "@/lib/eventoEstado";

export async function GET(request: NextRequest) {
  try {
    const noAutorizado = await requireAdmin();
    if (noAutorizado) return noAutorizado;

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10) || 50, 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0", 10) || 0, 0);

    console.log(`🔍 [GET /api/admin/eventos] Fetching eventos`);

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
      ORDER BY fecha_inicio DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await query(queryText, [limit, offset]);

    console.log(`✅ Found ${result.rows.length} eventos`);

    return NextResponse.json({
      success: true,
      data: result.rows,
      total: result.rows.length,
    });
  } catch (error) {
    console.error(`❌ [GET /api/admin/eventos] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener eventos",
        message: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Modificar eventos requiere un rol del área "contenido" (leído de la BD).
    const auth = await requireArea("contenido");
    if (!auth.ok) return auth.respuesta;

    const formData = await request.formData();

    console.log(`🔍 [POST /api/admin/eventos] Creating new evento`);

    // Extract and validate required fields
    const nombre = formData.get("nombre") as string;
    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    // Fechas: inicio obligatorio, fin >= inicio (se valida antes de guardar el banner)
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

    // Extract files
    const bannerFile = formData.get("banner") as File | null;

    // Upload banner if provided
    let bannerPath: string | null = null;
    if (bannerFile && bannerFile.size > 0) {
      const { saveFile } = await import("@/lib/fileUpload");
      bannerPath = await saveFile(bannerFile, "banners");
      console.log("✅ Banner saved:", bannerPath);
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

    // Insert into database
    const insertQuery = `
      INSERT INTO ciepi.eventos (
        nombre,
        descripcion,
        fecha_inicio,
        fecha_fin,
        ubicacion,
        banner
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const values = [
      nombre,
      descripcion ? JSON.stringify(descripcion) : null,
      fecha_inicio,
      fecha_fin,
      ubicacion,
      bannerPath,
    ];

    console.log("📊 Executing INSERT query");

    const result = await query(insertQuery, values);

    console.log(`✅ Evento ${result.rows[0].id} created successfully`);

    return NextResponse.json(
      {
        success: true,
        message: "Evento creado exitosamente",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(`❌ [POST /api/admin/eventos] Error:`, error);
    if (error instanceof ArchivoNoValidoError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      {
        success: false,
        error: "Error al crear evento",
        message: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
