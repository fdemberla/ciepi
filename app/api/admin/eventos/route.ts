import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50"), 1), 100);
    const offset = Math.max(parseInt(searchParams.get("offset") || "0"), 0);

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
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      );
    }

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

    const fecha_inicio = (formData.get("fecha_inicio") as string) || null;
    const fecha_fin = (formData.get("fecha_fin") as string) || null;
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

    return NextResponse.json(
      {
        success: false,
        error: "Error al crear evento",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
