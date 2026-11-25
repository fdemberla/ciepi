import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, withTransaction } from "@/lib/db";
import { BlogState, canCreateBlog } from "@/lib/permissions";
import { safeErrorDetail } from "@/lib/apiError";
import { requireArea } from "@/lib/adminAuth";
import { puedeEditarBlog, transicionesBlog, type ContextoBlog } from "@/lib/estados/blog";
import { registrarHistorial } from "@/lib/estadosServer";

// GET: Listar todos los blogs con filtros
export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y permisos de admin
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isAdmin || !session.user.adminId) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      );
    }

    // Rol desde la BD (no del JWT) para calcular las transiciones de cada fila.
    const rolRes = await query(
      `SELECT rol_id FROM ciepi.usuarios_administradores WHERE id = $1`,
      [session.user.adminId]
    );
    const adminId = Number(session.user.adminId);
    const rol = rolRes.rows.length ? Number(rolRes.rows[0].rol_id) : undefined;

    // Obtener parámetros de búsqueda
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = (searchParams.get("search") || "").slice(0, 100); // limit search length
    const estadoParam = searchParams.get("estado") || "";
    const creadoPor = searchParams.get("creado_por") || "";

    // Acepta uno o varios estados separados por coma (ej. "2,4"); solo 1-6.
    // Antes se leía solo el primero, y la bandeja "Pendientes" ocultaba los
    // blogs en revisión de Relaciones Públicas (estado 4).
    const VALID_ESTADOS = [1, 2, 3, 4, 5, 6];
    const estados = estadoParam
      .split(",")
      .map((e) => parseInt(e.trim(), 10))
      .filter((e) => VALID_ESTADOS.includes(e));

    const offset = (page - 1) * limit;

    // Construir query con filtros
    const whereConditions = [];
    const queryParams: (string | number | number[])[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(`b.titulo ILIKE $${paramIndex}`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (estados.length > 0) {
      whereConditions.push(`b.estado = ANY($${paramIndex}::int[])`);
      queryParams.push(estados);
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

    // Cada fila lleva las transiciones que el usuario actual puede ejecutar y si puede
    // editar el contenido: la interfaz solo dibuja esos botones.
    const data = blogsResult.rows.map((b) => {
      const ctx: ContextoBlog = { rol, esAutor: Number(b.creado_por) === adminId };
      return {
        ...b,
        es_autor: ctx.esAutor,
        puede_editar: puedeEditarBlog(b.estado, ctx),
        transiciones: transicionesBlog(b.estado, ctx),
      };
    });

    return NextResponse.json({
      success: true,
      data,
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
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}

// POST: Crear nuevo blog
export async function POST(request: NextRequest) {
  try {
    // Rol leído de la BD (usuario activo) y del área de contenido.
    const auth = await requireArea("contenido");
    if (!auth.ok) return auth.respuesta;
    const userRole = auth.rol;

    // Verificar permisos para crear blogs
    if (!canCreateBlog(userRole)) {
      return NextResponse.json(
        {
          error:
            "No tiene permisos para crear blogs. Solo roles CIEPI y Admin pueden crear.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { titulo, contenido, imagen_banner, palabras_clave } = body;

    // Estado inicial: Borrador (1) o "Enviar a revisión CIEPI" (2), según
    // eligió el autor en el editor. Cualquier otro valor se ignora.
    const estadoInicial =
      Number(body.estado) === BlogState.EN_REVISION_CIEPI
        ? BlogState.EN_REVISION_CIEPI
        : BlogState.BORRADOR;

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

    if (typeof titulo !== "string" || !titulo.trim() || titulo.trim().length > 255) {
      return NextResponse.json(
        { error: "El título es obligatorio y no puede superar los 255 caracteres" },
        { status: 400 }
      );
    }
    if (
      palabras_clave !== undefined &&
      (!Array.isArray(palabras_clave) || !palabras_clave.every((p: unknown) => typeof p === "string"))
    ) {
      return NextResponse.json(
        { error: "Las palabras clave deben ser una lista de textos" },
        { status: 400 }
      );
    }

    // Insertar nuevo blog y registrar la creación en el historial común.
    const creado = await withTransaction(async (q) => {
      const result = await q(
        `INSERT INTO ciepi.blogs (
          titulo,
          contenido,
          imagen_banner,
          palabras_clave,
          creado_por,
          estado
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, titulo, creado_en, estado`,
        [
          titulo.trim(),
          JSON.stringify(contenido),
          typeof imagen_banner === "string" && imagen_banner ? imagen_banner : null,
          JSON.stringify(palabras_clave || []),
          auth.adminId,
          estadoInicial,
        ]
      );
      const fila = result.rows[0];
      await registrarHistorial(q, {
        entidad: "blog",
        entidadId: fila.id,
        de: null,
        a: estadoInicial,
        accion: estadoInicial === BlogState.EN_REVISION_CIEPI ? "crear_y_enviar" : "crear",
        actor: { tipo: "admin", id: auth.adminId },
      });
      return fila;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Blog creado exitosamente",
        data: creado,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando blog:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al crear blog",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
