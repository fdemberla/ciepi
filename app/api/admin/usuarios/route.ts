import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";

// GET: Listar todos los usuarios
export async function GET() {
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
        { error: "No tienes permisos para acceder a la lista de usuarios" },
        { status: 403 }
      );
    }

    // Obtener todos los usuarios
    const usuariosQuery = `
      SELECT id, correo, nombre, apellido, activo, rol_id, fecha_creacion, ultimo_login
      FROM ciepi.usuarios_administradores
      ORDER BY nombre ASC
    `;

    const usuariosResult = await query(usuariosQuery, []);

    return NextResponse.json({
      success: true,
      data: usuariosResult.rows,
    });
  } catch (error) {
    console.error("Error obteniendo usuarios:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener usuarios",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo usuario
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

    // Solo roles 1 y 2 (admins) pueden crear usuarios
    if (userRole !== 1 && userRole !== 2) {
      return NextResponse.json(
        { error: "No tienes permisos para crear usuarios" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { correo, nombre, apellido, rol_id, activo } = body;

    // Validaciones
    if (!correo || !nombre || !apellido || !rol_id) {
      return NextResponse.json(
        { error: "Todos los campos son obligatorios" },
        { status: 400 }
      );
    }

    // Verificar que el correo no exista
    const checkQuery = `
      SELECT id FROM ciepi.usuarios_administradores 
      WHERE correo = $1
    `;
    const checkResult = await query(checkQuery, [correo]);

    if (checkResult.rows.length > 0) {
      return NextResponse.json(
        { error: "Ya existe un usuario con este correo electrónico" },
        { status: 409 }
      );
    }

    // Crear usuario
    const insertQuery = `
      INSERT INTO ciepi.usuarios_administradores 
      (correo, nombre, apellido, rol_id, activo)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, correo, nombre, apellido, activo, rol_id, fecha_creacion, ultimo_login
    `;

    const result = await query(insertQuery, [
      correo,
      nombre,
      apellido,
      rol_id,
      activo !== undefined ? activo : true,
    ]);

    return NextResponse.json({
      success: true,
      message: "Usuario creado exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error creando usuario:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al crear usuario",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
