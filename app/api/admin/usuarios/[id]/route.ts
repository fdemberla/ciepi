import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import { requireArea } from "@/lib/adminAuth";
import { safeErrorDetail } from "@/lib/apiError";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// GET: Obtener un usuario por ID
export async function GET(request: NextRequest, { params }: Params) {
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

    // Solo roles 1 y 2 (admins) pueden acceder
    if (userRole !== 1 && userRole !== 2) {
      return NextResponse.json(
        { error: "No tienes permisos para ver usuarios" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Obtener el usuario
    const usuarioQuery = `
      SELECT id, correo, nombre, apellido, activo, rol_id, fecha_creacion, ultimo_login
      FROM ciepi.usuarios_administradores
      WHERE id = $1
    `;

    const usuarioResult = await query(usuarioQuery, [id]);

    if (usuarioResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: usuarioResult.rows[0],
    });
  } catch (error) {
    console.error("Error obteniendo usuario:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener usuario",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}

// PUT: Actualizar un usuario
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    // Solo roles 1 y 2 (admins) pueden modificar usuarios (rol leído de la BD, usuario activo).
    const auth = await requireArea("configuracion");
    if (!auth.ok) return auth.respuesta;
    const userRole = auth.rol;

    const { id } = await params;
    const body = await request.json();
    const { nombre, apellido, rol_id, activo } = body;

    if (!id) {
      return NextResponse.json(
        { error: "ID del usuario es requerido" },
        { status: 400 }
      );
    }

    // Obtener el usuario actual
    const usuarioActualQuery = `
      SELECT rol_id FROM ciepi.usuarios_administradores WHERE id = $1
    `;
    const usuarioActualResult = await query(usuarioActualQuery, [id]);

    if (usuarioActualResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const usuarioRolActual = usuarioActualResult.rows[0].rol_id;

    // El formulario siempre envía rol_id; solo cuenta como cambio de rol si
    // es distinto del actual (antes esto bloqueaba cualquier edición del rol 2).
    const cambiaRol =
      rol_id !== undefined && Number(rol_id) !== usuarioRolActual;

    // No permitir cambiar el rol de un administrador (roles 1 o 2)
    if (cambiaRol && (usuarioRolActual === 1 || usuarioRolActual === 2)) {
      return NextResponse.json(
        { error: "No se puede cambiar el rol de un administrador" },
        { status: 403 }
      );
    }

    // Solo el Administrador Principal (rol 1) puede cambiar roles de usuarios
    if (cambiaRol && userRole !== 1) {
      return NextResponse.json(
        { error: "Solo el Administrador Principal puede cambiar roles de usuarios" },
        { status: 403 }
      );
    }

    // Construir query de actualización dinámicamente
    const updates: string[] = [];
    const values: (string | number | boolean)[] = [];
    let paramCount = 1;

    if (nombre !== undefined) {
      updates.push(`nombre = $${paramCount++}`);
      values.push(nombre);
    }
    if (apellido !== undefined) {
      updates.push(`apellido = $${paramCount++}`);
      values.push(apellido);
    }
    if (cambiaRol) {
      updates.push(`rol_id = $${paramCount++}`);
      values.push(Number(rol_id));
    }
    if (activo !== undefined) {
      const activoValue = activo === "true" || activo === true;
      updates.push(`activo = $${paramCount++}`);
      values.push(activoValue);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    values.push(id);

    const updateQuery = `
      UPDATE ciepi.usuarios_administradores
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, correo, nombre, apellido, activo, rol_id, fecha_creacion, ultimo_login
    `;

    const result = await query(updateQuery, values);

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
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
