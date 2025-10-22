import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "12");
    const search = searchParams.get("search") || "";
    const sortBy = searchParams.get("sortBy") || "fecha_creacion";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const offset = (page - 1) * limit;

    // Base query for published blogs only (estado = 6)
    let whereClause = "WHERE b.estado = 6";
    const queryParams: (string | number)[] = [];
    let paramCount = 0;

    // Add search functionality
    if (search.trim()) {
      paramCount++;
      whereClause += ` AND (
        b.titulo ILIKE $${paramCount} OR 
        EXISTS (
          SELECT 1 FROM unnest(b.palabras_clave) AS palabra 
          WHERE palabra ILIKE $${paramCount}
        )
      )`;
      queryParams.push(`%${search.trim()}%`);
    }

    // Validate sort parameters
    const validSortFields = ["creado_en", "titulo"];
    const validSortOrders = ["asc", "desc"];
    const safeSortBy = validSortFields.includes(sortBy) ? sortBy : "creado_en";
    const safeSortOrder = validSortOrders.includes(sortOrder.toLowerCase())
      ? sortOrder.toLowerCase()
      : "desc";

    // Main query
    const blogs_query = `
      SELECT 
        b.id,
        b.titulo,
        b.imagen_banner,
        b.palabras_clave,
        b.creado_en,
        -- Extract plain text from content for preview (first 200 chars)
        LEFT(
          REGEXP_REPLACE(
            COALESCE(
              (SELECT string_agg(child->>'text', ' ') 
               FROM jsonb_array_elements(b.contenido) AS elem,
                    jsonb_array_elements(elem->'children') AS child
               WHERE child->>'text' IS NOT NULL AND child->>'text' != ''),
              ''
            ), 
            '\s+', ' ', 'g'
          ), 
          200
        ) AS contenido_preview,
        u.nombre as autor_nombre
      FROM ciepi.blogs b
      LEFT JOIN ciepi.usuarios_administradores u ON b.creado_por = u.id
      ${whereClause}
      ORDER BY b.${safeSortBy} ${safeSortOrder.toUpperCase()}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    queryParams.push(limit, offset);

    const result = await query(blogs_query, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ciepi.blogs b
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2)); // Remove limit and offset
    const total = parseInt(countResult.rows[0].total);

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching blogs:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener blogs" },
      { status: 500 }
    );
  }
}
