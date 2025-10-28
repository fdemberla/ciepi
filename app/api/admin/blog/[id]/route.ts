import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import {
  canEditBlog,
  canChangeToState,
  canDeleteBlog,
} from "@/lib/permissions";

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
    // Verificar autenticación
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "No autorizado. Debe iniciar sesión." },
        { status: 401 }
      );
    }

    // Obtener el rol del usuario
    const roleQuery = `
      SELECT rol_id FROM ciepi.usuarios_administradores 
      WHERE id = $1
    `;
    const roleResult = await query(roleQuery, [session.user.adminId]);

    if (roleResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const userRole = roleResult.rows[0].rol_id;
    const { id } = await params;
    const body = await request.json();
    const {
      titulo,
      contenido,
      imagen_banner,
      palabras_clave,
      estado,
      comentario_temp,
    } = body;

    // Obtener el blog actual para validaciones
    const currentBlogQuery = `
      SELECT estado, creado_por FROM ciepi.blogs WHERE id = $1
    `;
    const currentBlogResult = await query(currentBlogQuery, [id]);

    if (currentBlogResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Blog no encontrado" },
        { status: 404 }
      );
    }

    const currentBlog = currentBlogResult.rows[0];
    const isCreator = currentBlog.creado_por === session.user.adminId;

    // Validación de permisos para EDITAR (no cambiar estado)
    if (titulo || contenido || imagen_banner || palabras_clave) {
      // Solo el creador (CIEPI) o admins pueden editar
      if (
        !canEditBlog(userRole) ||
        (!isCreator && userRole !== 1 && userRole !== 2)
      ) {
        return NextResponse.json(
          {
            error:
              "No tiene permisos para editar este blog. Solo Relaciones Públicas puede cambiar estados sin editar.",
          },
          { status: 403 }
        );
      }
    }

    // Validación de permisos para CAMBIAR ESTADO
    if (estado !== undefined && estado !== currentBlog.estado) {
      if (!canChangeToState(userRole, estado)) {
        return NextResponse.json(
          {
            error: "No tiene permisos para cambiar el blog a ese estado.",
          },
          { status: 403 }
        );
      }
    }

    // Si se cambia el estado y hay comentario, guardarlo temporalmente
    if (estado && comentario_temp) {
      await query("SELECT ciepi.set_comentario_estado($1, $2)", [
        id,
        comentario_temp,
      ]);
    }

    // Construir query de actualización dinámicamente
    const updates: string[] = [];
    const values: (string | number | null | boolean)[] = [];
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

    if (estado !== undefined && estado !== currentBlog.estado) {
      updates.push(`estado = $${paramIndex}`);
      values.push(estado);
      paramIndex++;

      // Si se está aprobando/rechazando, registrar quién lo hizo
      updates.push(`aprobado_por = $${paramIndex}`);
      values.push(session.user.adminId || null);
      paramIndex++;

      updates.push(`aprobado_en = CURRENT_TIMESTAMP`);
    }

    // Si no hay actualizaciones, retornar error
    if (updates.length === 0) {
      return NextResponse.json(
        { error: "Se debe proporcionar al menos un campo para actualizar" },
        { status: 400 }
      );
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
    // Verificar autenticación
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: "No autorizado. Debe iniciar sesión." },
        { status: 401 }
      );
    }

    // Obtener el rol del usuario
    const roleQuery = `
      SELECT rol_id FROM ciepi.usuarios_administradores 
      WHERE id = $1
    `;
    const roleResult = await query(roleQuery, [session.user.adminId]);

    if (roleResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const userRole = roleResult.rows[0].rol_id;

    // Validación de permisos para ELIMINAR
    if (!canDeleteBlog(userRole)) {
      return NextResponse.json(
        {
          error:
            "No tienes permisos para eliminar blogs. Solo administradores pueden hacerlo.",
        },
        { status: 403 }
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
