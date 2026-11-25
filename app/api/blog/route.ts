import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

const LIMITE_MAX = 50;
const LIMITE_POR_DEFECTO = 12;
const BUSQUEDA_MAX = 100;

/** Entero acotado a [min, max]; si no es un número válido devuelve el valor por defecto. */
function enteroAcotado(valor: string | null, porDefecto: number, min: number, max: number): number {
  const n = Number.parseInt(valor ?? "", 10);
  if (!Number.isFinite(n)) return porDefecto;
  return Math.min(Math.max(n, min), max);
}

/** Escapa los comodines de LIKE (`%`, `_`) y la barra de escape. */
function escaparLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = enteroAcotado(searchParams.get("page"), 1, 1, 10_000);
    const limit = enteroAcotado(searchParams.get("limit"), LIMITE_POR_DEFECTO, 1, LIMITE_MAX);
    const search = (searchParams.get("search") || "").trim().slice(0, BUSQUEDA_MAX);
    const sortBy = searchParams.get("sortBy") || "creado_en";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    const offset = (page - 1) * limit;

    // Solo blogs publicados (estado = 6)
    let whereClause = "WHERE b.estado = 6";
    const queryParams: (string | number)[] = [];
    let paramCount = 0;

    // Búsqueda por título o palabra clave. palabras_clave es JSONB, por eso
    // jsonb_array_elements_text (unnest() no existe para jsonb y daba 500).
    if (search) {
      paramCount++;
      whereClause += ` AND (
        b.titulo ILIKE $${paramCount} ESCAPE '\\' OR
        EXISTS (
          SELECT 1
          FROM jsonb_array_elements_text(
            CASE WHEN jsonb_typeof(b.palabras_clave) = 'array'
                 THEN b.palabras_clave ELSE '[]'::jsonb END
          ) AS palabra
          WHERE palabra ILIKE $${paramCount} ESCAPE '\\'
        )
      )`;
      queryParams.push(`%${escaparLike(search)}%`);
    }

    // Lista blanca de orden ("fecha_creacion" es el nombre que usa la página /blog)
    const camposOrden: Record<string, string> = {
      creado_en: "creado_en",
      fecha_creacion: "creado_en",
      titulo: "titulo",
    };
    const safeSortBy = camposOrden[sortBy] ?? "creado_en";
    const safeSortOrder = sortOrder.toLowerCase() === "asc" ? "ASC" : "DESC";

    const blogs_query = `
      SELECT
        b.id,
        b.titulo,
        b.imagen_banner,
        b.palabras_clave,
        b.creado_en,
        -- Extracto en texto plano (primeros 200 caracteres)
        LEFT(
          REGEXP_REPLACE(
            COALESCE(
              (SELECT string_agg(child->>'text', ' ')
               FROM jsonb_array_elements(b.contenido) AS elem,
                    jsonb_array_elements(elem->'children') AS child
               WHERE child->>'text' IS NOT NULL AND child->>'text' != ''),
              ''
            ),
            '[[:space:]]+', ' ', 'g'
          ),
          200
        ) AS contenido_preview,
        u.nombre as autor_nombre
      FROM ciepi.blogs b
      LEFT JOIN ciepi.usuarios_administradores u ON b.creado_por = u.id
      ${whereClause}
      ORDER BY b.${safeSortBy} ${safeSortOrder}, b.id DESC
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const countQuery = `
      SELECT COUNT(*) as total
      FROM ciepi.blogs b
      ${whereClause}
    `;

    const [result, countResult] = await Promise.all([
      query(blogs_query, [...queryParams, limit, offset]),
      query(countQuery, queryParams),
    ]);
    const total = Number.parseInt(countResult.rows[0]?.total ?? "0", 10) || 0;
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    // El detalle queda en el log del servidor; al cliente solo un mensaje genérico.
    console.error("Error fetching blogs:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener blogs" },
      { status: 500 }
    );
  }
}
