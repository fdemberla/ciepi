import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, parseId } from "@/lib/adminAuth";
import { SQL_RESERVA_OCUPA } from "@/lib/mentoriasServer";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;

/** Agrega un periodo en que el mentor no atiende (vacaciones, licencia...). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: "Profesor no válido." }, { status: 400 });

  try {
    const body = await request.json().catch(() => ({}));
    const fecha_inicio = String(body.fecha_inicio ?? "");
    const fecha_fin = String(body.fecha_fin ?? "") || fecha_inicio;
    const motivo = typeof body.motivo === "string" && body.motivo.trim() ? body.motivo.trim().slice(0, 200) : null;
    if (!FECHA.test(fecha_inicio) || !FECHA.test(fecha_fin)) {
      return NextResponse.json({ success: false, error: "Indica las fechas del bloqueo." }, { status: 400 });
    }
    if (fecha_fin < fecha_inicio) {
      return NextResponse.json({ success: false, error: "La fecha final es anterior a la inicial." }, { status: 400 });
    }
    const result = await query(
      `INSERT INTO ciepi.mentor_bloqueos (profesor_id, fecha_inicio, fecha_fin, motivo)
       SELECT $1, $2::date, $3::date, $4 WHERE EXISTS (SELECT 1 FROM ciepi.profesores WHERE id = $1)
       RETURNING id, to_char(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio,
                 to_char(fecha_fin, 'YYYY-MM-DD') AS fecha_fin, motivo`,
      [id, fecha_inicio, fecha_fin, motivo]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Profesor no encontrado." }, { status: 404 });
    }
    // Las reservas activas de esas fechas no se tocan solas: se avisa al admin para que
    // las cancele (con aviso a cada persona) desde la bandeja de reservas. Mientras tanto,
    // las pendientes ya no se pueden confirmar (ver SQL_MENTOR_DISPONIBLE).
    const afectadas = await query(
      `SELECT r.id FROM ciepi.mentoria_reservas r
        WHERE r.profesor_id = $1 AND r.inicio > NOW() AND ${SQL_RESERVA_OCUPA}
          AND (r.inicio AT TIME ZONE 'America/Panama')::date BETWEEN $2::date AND $3::date
        ORDER BY r.inicio`,
      [id, fecha_inicio, fecha_fin]
    );
    const avisos =
      afectadas.rowCount && afectadas.rowCount > 0
        ? [
            `Hay ${afectadas.rowCount} mentoría${afectadas.rowCount === 1 ? "" : "s"} activa${
              afectadas.rowCount === 1 ? "" : "s"
            } en esas fechas (${afectadas.rows.map((r) => `#${r.id}`).join(", ")}). Cancélala${
              afectadas.rowCount === 1 ? "" : "s"
            } desde Reservas para avisar a cada persona.`,
          ]
        : [];
    return NextResponse.json({ success: true, data: result.rows[0], avisos }, { status: 201 });
  } catch (error) {
    console.error("Error al crear bloqueo:", error);
    return NextResponse.json({ success: false, error: "Error al guardar el bloqueo." }, { status: 500 });
  }
}
