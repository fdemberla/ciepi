import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  ESTADOS_EVENTO,
  estadoEvento,
  estadoEventoSql,
  parseEstadoEvento,
  type EstadoEvento,
} from "@/lib/eventoEstado";

const LIMITE_MAX = 200;
const LIMITE_POR_DEFECTO = 100;

function enteroAcotado(valor: string | null, porDefecto: number, min: number, max: number): number {
  const n = Number.parseInt(valor ?? "", 10);
  if (!Number.isFinite(n)) return porDefecto;
  return Math.min(Math.max(n, min), max);
}

/**
 * GET /api/eventos
 * Lista pública de eventos. Cada evento incluye `estado` calculado
 * (proximo | en_curso | finalizado) con lib/eventoEstado.
 * Parámetros query:
 *   - limit: eventos a traer (1-200, por defecto 100)
 *   - offset: desplazamiento para paginación (>= 0, por defecto 0)
 *   - estado: proximo | en_curso | finalizado (también futuro, en-curso, pasado).
 *     Se filtra en SQL, antes del LIMIT.
 * Respuesta: { data, total (con el filtro), limit, offset, conteos: { todos, proximo, en_curso, finalizado } }
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = enteroAcotado(searchParams.get("limit"), LIMITE_POR_DEFECTO, 1, LIMITE_MAX);
    const offset = enteroAcotado(searchParams.get("offset"), 0, 0, 1_000_000);

    const estadoParam = searchParams.get("estado");
    const estado = parseEstadoEvento(estadoParam);
    if (estadoParam && !estado) {
      return NextResponse.json(
        {
          success: false,
          error: `Estado no válido. Use: ${ESTADOS_EVENTO.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const estadoSql = estadoEventoSql("e");
    const params: unknown[] = [];
    let where = "";
    if (estado) {
      params.push(estado);
      where = `WHERE ${estadoSql} = $1`;
    }
    // Los próximos, del más cercano al más lejano; el resto, del más reciente al más antiguo.
    const orden =
      estado === "proximo"
        ? "e.fecha_inicio ASC NULLS LAST, e.id ASC"
        : "e.fecha_inicio DESC NULLS LAST, e.id DESC";

    const sql = `
      SELECT e.id, e.nombre, e.descripcion, e.fecha_inicio, e.fecha_fin,
             e.ubicacion, e.banner, e.galeria, e.fecha_creacion, e.fecha_actualizacion
      FROM ciepi.eventos e
      ${where}
      ORDER BY ${orden}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const [result, conteoResult] = await Promise.all([
      query(sql, [...params, limit, offset]),
      query(
        `SELECT ${estadoSql} AS estado, COUNT(*)::int AS total
         FROM ciepi.eventos e
         GROUP BY 1`,
        []
      ),
    ]);

    const conteos: Record<EstadoEvento | "todos", number> = {
      todos: 0,
      proximo: 0,
      en_curso: 0,
      finalizado: 0,
    };
    for (const fila of conteoResult.rows ?? []) {
      const e = parseEstadoEvento(fila.estado);
      const n = Number(fila.total) || 0;
      if (e) conteos[e] += n;
      conteos.todos += n;
    }

    const ahora = new Date();
    const eventos = (result.rows ?? []).map((ev) => ({
      ...ev,
      estado: estadoEvento(ev.fecha_inicio, ev.fecha_fin, ahora),
    }));

    return NextResponse.json(
      {
        success: true,
        data: eventos,
        total: estado ? conteos[estado] : conteos.todos,
        limit,
        offset,
        conteos,
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
