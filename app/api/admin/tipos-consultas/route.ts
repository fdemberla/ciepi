import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";

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
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo tipo de consulta (solo admin)
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

    const body = await request.json();
    const { nombre, descripcion, activo } = body;

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
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
