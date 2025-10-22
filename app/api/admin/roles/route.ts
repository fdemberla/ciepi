import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";

// GET: Listar todos los roles
export async function GET(request: NextRequest) {
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
        { error: "No tienes permisos para acceder a la gestión de roles" },
        { status: 403 }
      );
    }

    // Obtener todos los roles
    const rolesQuery = `
      SELECT id, nombre, activo, fecha_creacion
      FROM ciepi.roles
      ORDER BY id ASC
    `;

    const rolesResult = await query(rolesQuery, []);

    return NextResponse.json({
      success: true,
      data: rolesResult.rows,
    });
  } catch (error) {
    console.error("Error obteniendo roles:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener roles",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// PUT: Actualizar un rol
export async function PUT(request: NextRequest) {
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

    // Solo roles 1 y 2 (admins) pueden hacer cambios
    if (userRole !== 1 && userRole !== 2) {
      return NextResponse.json(
        { error: "No tienes permisos para modificar roles" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, nombre, activo } = body;

    if (!id || nombre === undefined || activo === undefined) {
      return NextResponse.json(
        { error: "ID, nombre y estado activo son requeridos" },
        { status: 400 }
      );
    }

    // No permitir cambios en roles 1 y 2 (admins)
    if (id === 1 || id === 2) {
      return NextResponse.json(
        { error: "No se pueden modificar los roles de administrador" },
        { status: 403 }
      );
    }

    const updateQuery = `
      UPDATE ciepi.roles
      SET nombre = $1, activo = $2
      WHERE id = $3
      RETURNING id, nombre, activo, fecha_creacion
    `;

    const result = await query(updateQuery, [nombre, activo, id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Rol actualizado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error actualizando rol:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar rol",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo rol
export async function POST(request: NextRequest) {
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

    // Solo roles 1 y 2 (admins) pueden crear roles
    if (userRole !== 1 && userRole !== 2) {
      return NextResponse.json(
        { error: "No tienes permisos para crear roles" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { nombre, activo } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: "El nombre del rol es requerido" },
        { status: 400 }
      );
    }

    const insertQuery = `
      INSERT INTO ciepi.roles (nombre, activo, fecha_creacion)
      VALUES ($1, $2, CURRENT_TIMESTAMP)
      RETURNING id, nombre, activo, fecha_creacion
    `;

    const result = await query(insertQuery, [nombre, activo ?? true]);

    return NextResponse.json(
      {
        success: true,
        message: "Rol creado exitosamente",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando rol:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al crear rol",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
