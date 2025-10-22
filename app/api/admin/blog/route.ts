import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import { canCreateBlog } from "@/lib/permissions";

// GET: Listar todos los blogs con filtros
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y permisos de admin
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      );
    }

    // Obtener parámetros de búsqueda
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";
    const estado = searchParams.get("estado") || "";
    const creadoPor = searchParams.get("creado_por") || "";

    const offset = (page - 1) * limit;

    // Construir query con filtros
    const whereConditions = [];
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`b.titulo ILIKE $${paramIndex}`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (estado) {
      whereConditions.push(`b.estado = $${paramIndex}`);
      queryParams.push(parseInt(estado));
      paramIndex++;
    }

    if (creadoPor) {
      whereConditions.push(`b.creado_por = $${paramIndex}`);
      queryParams.push(creadoPor);
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Query para obtener blogs con información del autor
    const blogsQuery = `
      SELECT 
        b.id,
        b.titulo,
        b.imagen_banner,
        b.palabras_clave,
        b.creado_por,
        u.nombre as autor_nombre,
        b.creado_en,
        b.estado,
        b.aprobado_por,
        ua.nombre as aprobado_por_nombre,
        b.aprobado_en,
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
      ${whereClause}
      ORDER BY b.creado_en DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ciepi.blogs b
      ${whereClause}
    `;

    const [blogsResult, countResult] = await Promise.all([
      query(blogsQuery, queryParams),
      query(countQuery, queryParams.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: blogsResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error obteniendo blogs:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener blogs",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo blog
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

    // Obtener el rol del usuario desde la BD
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

    // Verificar permisos para crear blogs
    if (!canCreateBlog(userRole)) {
      return NextResponse.json(
        { error: "No tiene permisos para crear blogs. Solo roles CIEPI y Admin pueden crear." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { titulo, contenido, imagen_banner, palabras_clave } = body;

    // Validar campos obligatorios
    if (!titulo || !contenido) {
      return NextResponse.json(
        { error: "Título y contenido son obligatorios" },
        { status: 400 }
      );
    }

    // Validar que contenido sea un array válido de Slate
    if (!Array.isArray(contenido)) {
      return NextResponse.json(
        { error: "El contenido debe ser un array válido de Slate" },
        { status: 400 }
      );
    }

    // Insertar nuevo blog
    const insertQuery = `
      INSERT INTO ciepi.blogs (
        titulo,
        contenido,
        imagen_banner,
        palabras_clave,
        creado_por,
        estado
      ) VALUES ($1, $2, $3, $4, $5, 1)
      RETURNING id, titulo, creado_en, estado
    `;

    const result = await query(insertQuery, [
      titulo,
      JSON.stringify(contenido),
      imagen_banner || null,
      JSON.stringify(palabras_clave || []),
      session.user.adminId,
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Blog creado exitosamente",
        data: result.rows[0],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando blog:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al crear blog",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
