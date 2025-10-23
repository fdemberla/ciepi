import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * GET /api/eventos
 * Obtiene la lista de eventos (público)
 * Parámetros query:
 *   - limit: número de eventos a traer (por defecto 100)
 *   - offset: desplazamiento para paginación (por defecto 0)
 *   - estado: filtrar por estado (futuro, en-curso, pasado)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);
    const offset = parseInt(searchParams.get("offset") || "0");

    let sql = "SELECT * FROM ciepi.eventos ORDER BY fecha_inicio DESC";
    const params: unknown[] = [];

    // Paginación
    sql += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await query(sql, params);
    const eventos = result.rows || [];

    // Contar total
    const countResult = await query(
      "SELECT COUNT(*) as total FROM eventos",
      []
    );
    const total = parseInt(countResult.rows?.[0]?.total || "0");

    console.log(
      `[GET /api/eventos] Retrieved ${eventos.length} eventos (total: ${total})`
    );

    return NextResponse.json(
      {
        success: true,
        data: eventos,
        total,
        limit,
        offset,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in GET /api/eventos:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener eventos",
      },
      { status: 500 }
    );
  }
}
