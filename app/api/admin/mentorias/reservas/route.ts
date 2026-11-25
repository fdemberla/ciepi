import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { estadoEfectivoReserva, transicionesReserva } from "@/lib/estados/mentoriaReserva";

export const dynamic = "force-dynamic";

/**
 * Vistas de la bandeja de reservas:
 * - proximas: confirmadas que aún no terminan.
 * - por_cerrar: confirmadas cuya hora ya llegó (marcar realizada o inasistencia).
 * - pendientes: esperando que la persona confirme su correo.
 * - historial: realizadas, inasistencias, canceladas y expiradas.
 * - calendario: todo menos expiradas, entre ?desde y ?hasta (YYYY-MM-DD, hora de Panamá).
 */
const VISTAS: Record<string, { where: string; order: string }> = {
  proximas: { where: `r.estado = 'confirmada' AND r.inicio > NOW()`, order: "r.inicio ASC" },
  por_cerrar: { where: `r.estado = 'confirmada' AND r.inicio <= NOW()`, order: "r.inicio ASC" },
  pendientes: { where: `r.estado = 'pendiente_verificacion' AND r.pendiente_expira > NOW()`, order: "r.inicio ASC" },
  historial: {
    where: `(r.estado IN ('completada','no_asistio','cancelada_usuario','cancelada_ciepi','expirada')
             OR (r.estado = 'pendiente_verificacion' AND r.pendiente_expira <= NOW()))`,
    order: "r.inicio DESC",
  },
  calendario: { where: `r.estado <> 'expirada' AND NOT (r.estado = 'pendiente_verificacion' AND r.pendiente_expira <= NOW())`, order: "r.inicio ASC" },
};

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const rol = (await getServerSession(authOptions))?.user?.rolId;

  const sp = request.nextUrl.searchParams;
  const vista = VISTAS[sp.get("vista") ?? "proximas"] ? (sp.get("vista") ?? "proximas") : "proximas";
  const params: unknown[] = [];
  const cond = [VISTAS[vista].where];

  const profesor = Number(sp.get("profesor_id"));
  if (Number.isInteger(profesor) && profesor > 0) {
    params.push(profesor);
    cond.push(`r.profesor_id = $${params.length}`);
  }
  const desde = sp.get("desde");
  const hasta = sp.get("hasta");
  if (desde && FECHA.test(desde)) {
    params.push(desde);
    cond.push(`r.inicio >= ($${params.length}::date)::timestamp AT TIME ZONE 'America/Panama'`);
  }
  if (hasta && FECHA.test(hasta)) {
    params.push(hasta);
    cond.push(`r.inicio < (($${params.length}::date + 1)::timestamp AT TIME ZONE 'America/Panama')`);
  }

  try {
    const result = await query(
      `SELECT r.id, r.profesor_id, r.inicio, r.fin, r.modalidad, r.estado, r.pendiente_expira,
              r.nombre, r.correo, r.telefono, r.tema, r.enlace_reunion, r.notas_admin,
              r.fecha_creacion, r.confirmada_en, r.cancelada_en, NOW() AS ahora,
              p.nombre || ' ' || p.apellido AS mentor,
              a.nombre AS area, s.nombre AS sede, au.nombre AS aula
       FROM ciepi.mentoria_reservas r
       JOIN ciepi.profesores p ON p.id = r.profesor_id
       LEFT JOIN ciepi.mentoria_areas a ON a.id = r.area_id
       LEFT JOIN ciepi.sedes s ON s.id = r.sede_id
       LEFT JOIN ciepi.aulas au ON au.id = r.aula_id
       WHERE ${cond.join(" AND ")}
       ORDER BY ${VISTAS[vista].order}
       LIMIT 500`,
      params
    );
    const ahora = new Date(result.rows[0]?.ahora ?? Date.now());
    const conteos = await query(
      `SELECT
         COUNT(*) FILTER (WHERE ${VISTAS.proximas.where})::int AS proximas,
         COUNT(*) FILTER (WHERE ${VISTAS.por_cerrar.where})::int AS por_cerrar,
         COUNT(*) FILTER (WHERE ${VISTAS.pendientes.where})::int AS pendientes
       FROM ciepi.mentoria_reservas r`,
      []
    );
    return NextResponse.json({
      success: true,
      data: result.rows.map((r) => ({
        ...r,
        // Una pendiente vencida se muestra como expirada y no tiene transiciones:
        // ambas cosas se calculan con el mismo estado efectivo y la hora de la BD.
        estado: estadoEfectivoReserva(r.estado, r.pendiente_expira, ahora),
        transiciones: transicionesReserva(r, { actor: "admin", ahora, rol }),
      })),
      conteos: conteos.rows[0],
    });
  } catch (error) {
    console.error("Error al listar reservas de mentoría:", error);
    return NextResponse.json({ success: false, error: "Error al cargar las reservas." }, { status: 500 });
  }
}
