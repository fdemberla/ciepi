import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// PUT: Actualizar un usuario (cambiar rol)
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

    // Obtener el rol del usuario actual
    const roleQuery = `
      SELECT rol FROM ciepi.usuarios_administradores 
      WHERE id = $1
    `;
    const roleResult = await query(roleQuery, [session.user.adminId]);

    if (roleResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const userRole = roleResult.rows[0].rol;

    // Solo roles 1 y 2 (admins) pueden cambiar roles de usuarios
    if (userRole !== 1 && userRole !== 2) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar usuarios" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { rol, activo } = body;

    if (!id || rol === undefined) {
      return NextResponse.json(
        { error: "ID del usuario y rol son requeridos" },
        { status: 400 }
      );
    }

    // No permitir cambiar el rol de un administrador
    const usuarioActualQuery = `
      SELECT rol FROM ciepi.usuarios_administradores WHERE id = $1
    `;
    const usuarioActualResult = await query(usuarioActualQuery, [id]);

    if (usuarioActualResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const usuarioRolActual = usuarioActualResult.rows[0].rol;

    // No permitir cambiar rol si es admin
    if (usuarioRolActual === 1 || usuarioRolActual === 2) {
      return NextResponse.json(
        { error: "No se puede cambiar el rol de un administrador" },
        { status: 403 }
      );
    }

    // Actualizar usuario
    let updateQuery = `
      UPDATE ciepi.usuarios_administradores
      SET rol = $1
    `;
    const params_array: (string | number | boolean)[] = [rol, id];

    if (activo !== undefined) {
      updateQuery += `, activo = $3`;
      params_array.push(activo);
    }

    updateQuery += `
      WHERE id = $${params_array.length}
      RETURNING id, correo, nombre, apellido, activo, rol, fecha_creacion, ultimo_login
    `;

    const result = await query(updateQuery, params_array);

    return NextResponse.json({
      success: true,
      message: "Usuario actualizado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error actualizando usuario:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar usuario",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
