import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * GET /api/eventos/[id]
 * Obtiene un evento específico (público)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const id = resolvedParams.id;

    const sql = "SELECT * FROM eventos WHERE id = $1";
    const result = await query(sql, [id]);

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Evento no encontrado",
        },
        { status: 404 }
      );
    }

    const evento = result.rows[0];

    console.log(`[GET /api/eventos/${id}] Retrieved evento: ${evento.nombre}`);

    return NextResponse.json(
      {
        success: true,
        data: evento,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`Error in GET /api/eventos/[id]:`, error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener el evento",
      },
      { status: 500 }
    );
  }
}
