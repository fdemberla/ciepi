import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// GET: Obtener un tipo de consulta específico
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;

    const tipoQuery = `
      SELECT 
        id,
        nombre,
        activo
      FROM ciepi.tipos_consulta
      WHERE id = $1
    `;

    const result = await query(tipoQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Tipo de consulta no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error obteniendo tipo de consulta:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener tipo de consulta",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT: Actualizar un tipo de consulta (solo admin)
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    // Verificar autenticación y permisos de admin
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { nombre, descripcion, activo } = body;

    // Validar que al menos un campo esté presente
    if (
      nombre === undefined &&
      descripcion === undefined &&
      activo === undefined
    ) {
      return NextResponse.json(
        { error: "Se debe proporcionar al menos un campo para actualizar" },
        { status: 400 }
      );
    }

    // Si se actualiza el nombre, verificar que no exista otro con ese nombre
    if (nombre) {
      const checkQuery = `
        SELECT id FROM ciepi.tipos_consulta
        WHERE LOWER(nombre) = LOWER($1) AND id != $2
      `;

      const checkResult = await query(checkQuery, [nombre, id]);

      if (checkResult.rows.length > 0) {
        return NextResponse.json(
          { error: "Ya existe otro tipo de consulta con ese nombre" },
          { status: 409 }
        );
      }
    }

    // Construir query de actualización dinámicamente
    const updates: string[] = [];
    const values: (string | boolean | number)[] = [];
    let paramIndex = 1;

    if (nombre !== undefined) {
      updates.push(`nombre = $${paramIndex}`);
      values.push(nombre);
      paramIndex++;
    }

    if (descripcion !== undefined) {
      updates.push(`descripcion = $${paramIndex}`);
      values.push(descripcion);
      paramIndex++;
    }

    if (activo !== undefined) {
      updates.push(`activo = $${paramIndex}`);
      values.push(activo);
      paramIndex++;
    }

    values.push(id);

    const updateQuery = `
      UPDATE ciepi.tipos_consulta
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING id, nombre
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Tipo de consulta no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tipo de consulta actualizado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error actualizando tipo de consulta:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar tipo de consulta",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar un tipo de consulta (solo admin)
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    // Verificar autenticación y permisos de admin
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Verificar si hay consultas usando este tipo
    const checkConsultasQuery = `
      SELECT COUNT(*) as count
      FROM ciepi.consultas
      WHERE tipo_consulta_id = $1
    `;

    const checkResult = await query(checkConsultasQuery, [id]);
    const consultasCount = parseInt(checkResult.rows[0].count);

    if (consultasCount > 0) {
      return NextResponse.json(
        {
          error: `No se puede eliminar. Hay ${consultasCount} consulta(s) usando este tipo. Considere desactivarlo en su lugar.`,
          consultasCount,
        },
        { status: 409 }
      );
    }

    // Eliminar el tipo
    const deleteQuery = `
      DELETE FROM ciepi.tipos_consulta
      WHERE id = $1
      RETURNING id
    `;

    const result = await query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Tipo de consulta no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Tipo de consulta eliminado exitosamente",
    });
  } catch (error) {
    console.error("Error eliminando tipo de consulta:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al eliminar tipo de consulta",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
