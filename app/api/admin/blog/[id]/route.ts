import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// GET: Obtener un blog específico
export async function GET(request: NextRequest, { params }: Params) {
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

    const blogQuery = `
      SELECT 
        b.id,
        b.titulo,
        b.contenido,
        b.imagen_banner,
        b.palabras_clave,
        b.creado_por,
        u.nombre as autor_nombre,
        b.creado_en,
        b.estado,
        b.aprobado_por,
        ua.nombre as aprobado_por_nombre,
        b.aprobado_en,
        b.historial_estados,
        CASE b.estado
          WHEN 1 THEN 'Borrador'
          WHEN 2 THEN 'En Revisión CIEPI'
          WHEN 3 THEN 'Rechazado por CIEPI'
          WHEN 4 THEN 'En Revisión Relaciones Públicas'
          WHEN 5 THEN 'Rechazado por Relaciones Públicas'
          WHEN 6 THEN 'Publicado'
        END as estado_nombre
      FROM ciepi.blogs b
      LEFT JOIN ciepi.usuarios_administradores u ON b.creado_por = u.id
      LEFT JOIN ciepi.usuarios_administradores ua ON b.aprobado_por = ua.id
      WHERE b.id = $1
    `;

    const result = await query(blogQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Blog no encontrado" },
        { status: 404 }
      );
    }

    // Parsear contenido JSON
    const blog = result.rows[0];
    blog.contenido = blog.contenido;
    blog.palabras_clave = blog.palabras_clave;
    blog.historial_estados = blog.historial_estados;

    return NextResponse.json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Error obteniendo blog:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener blog",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT: Actualizar blog
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
    const {
      titulo,
      contenido,
      imagen_banner,
      palabras_clave,
      estado,
      comentario,
    } = body;

    // Validar que al menos un campo esté presente
    if (
      !titulo &&
      !contenido &&
      !imagen_banner &&
      palabras_clave === undefined &&
      !estado
    ) {
      return NextResponse.json(
        { error: "Se debe proporcionar al menos un campo para actualizar" },
        { status: 400 }
      );
    }

    // Si se cambia el estado y hay comentario, guardarlo temporalmente
    if (estado && comentario) {
      await query("SELECT ciepi.set_comentario_estado($1, $2)", [
        id,
        comentario,
      ]);
    }

    // Construir query de actualización dinámicamente
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    if (titulo !== undefined) {
      updates.push(`titulo = $${paramIndex}`);
      values.push(titulo);
      paramIndex++;
    }

    if (contenido !== undefined) {
      updates.push(`contenido = $${paramIndex}`);
      values.push(JSON.stringify(contenido));
      paramIndex++;
    }

    if (imagen_banner !== undefined) {
      updates.push(`imagen_banner = $${paramIndex}`);
      values.push(imagen_banner);
      paramIndex++;
    }

    if (palabras_clave !== undefined) {
      updates.push(`palabras_clave = $${paramIndex}`);
      values.push(JSON.stringify(palabras_clave));
      paramIndex++;
    }

    if (estado !== undefined) {
      updates.push(`estado = $${paramIndex}`);
      values.push(estado);
      paramIndex++;

      // Si se está aprobando/rechazando, registrar quién lo hizo
      if ([2, 3, 4, 5, 6].includes(estado)) {
        updates.push(`aprobado_por = $${paramIndex}`);
        values.push(session.user.adminId || null);
        paramIndex++;

        updates.push(`aprobado_en = CURRENT_TIMESTAMP`);
      }
    }

    values.push(id);

    const updateQuery = `
      UPDATE ciepi.blogs
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        titulo,
        estado,
        CASE estado
          WHEN 1 THEN 'Borrador'
          WHEN 2 THEN 'En Revisión CIEPI'
          WHEN 3 THEN 'Rechazado por CIEPI'
          WHEN 4 THEN 'En Revisión Relaciones Públicas'
          WHEN 5 THEN 'Rechazado por Relaciones Públicas'
          WHEN 6 THEN 'Publicado'
        END as estado_nombre
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Blog no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Blog actualizado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error actualizando blog:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar blog",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar blog
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

    const deleteQuery = `
      DELETE FROM ciepi.blogs
      WHERE id = $1
      RETURNING id, titulo
    `;

    const result = await query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Blog no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Blog "${result.rows[0].titulo}" eliminado exitosamente`,
    });
  } catch (error) {
    console.error("Error eliminando blog:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al eliminar blog",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
