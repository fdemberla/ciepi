import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireArea } from "@/lib/adminAuth";
import { safeErrorDetail } from "@/lib/apiError";

// GET: Listar todos los tipos de consulta (público)
export async function GET() {
  try {
    const tiposQuery = `
      SELECT 
        id,
        nombre,
        activo
      FROM ciepi.tipos_consulta
      ORDER BY nombre ASC
    `;

    const result = await query(tiposQuery, []);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error obteniendo tipos de consulta:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener tipos de consulta",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo tipo de consulta (solo admin)
export async function POST(request: NextRequest) {
  try {
    // Solo roles de configuración (rol leído de la BD, usuario activo).
    const auth = await requireArea("configuracion");
    if (!auth.ok) return auth.respuesta;

    const body = await request.json();
    const { nombre, activo } = body;

    // Validar campos obligatorios
    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    // Verificar si ya existe un tipo con ese nombre
    const checkQuery = `
      SELECT id FROM ciepi.tipos_consulta
      WHERE LOWER(nombre) = LOWER($1)
    `;

    const checkResult = await query(checkQuery, [nombre]);

    if (checkResult.rows.length > 0) {
      return NextResponse.json(
        { error: "Ya existe un tipo de consulta con ese nombre" },
        { status: 409 }
      );
    }

    // Insertar nuevo tipo
    const insertQuery = `
      INSERT INTO ciepi.tipos_consulta (nombre, activo)
      VALUES ($1, $2)
      RETURNING id, nombre, activo
    `;

    const result = await query(insertQuery, [
      nombre,
      activo !== undefined ? activo : true,
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Tipo de consulta creado exitosamente",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando tipo de consulta:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al crear tipo de consulta",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
