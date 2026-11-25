import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, parseId } from "@/lib/adminAuth";
import { generarTurnos, ANTICIPACION_RESERVA_HORAS } from "@/lib/mentorias";

/**
 * Vista previa de los turnos que verá el público (mismas reglas que usará la
 * reserva pública en la fase 2). ?dias=14 por defecto, máximo 60.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: "Profesor no válido." }, { status: 400 });
  const dias = Math.min(60, Math.max(1, Number(request.nextUrl.searchParams.get("dias")) || 14));

  try {
    const prof = await query(`SELECT duracion_mentoria_min FROM ciepi.profesores WHERE id = $1`, [id]);
    if (prof.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Profesor no encontrado." }, { status: 404 });
    }
    const [disp, bloqueos, ocupados] = await Promise.all([
      query(
        `SELECT id, dia_semana, to_char(hora_inicio, 'HH24:MI') AS hora_inicio, to_char(hora_fin, 'HH24:MI') AS hora_fin,
                modalidad, sede_id, aula_id,
                to_char(vigente_desde, 'YYYY-MM-DD') AS vigente_desde, to_char(vigente_hasta, 'YYYY-MM-DD') AS vigente_hasta
         FROM ciepi.mentor_disponibilidad WHERE profesor_id = $1`,
        [id]
      ),
      query(
        `SELECT to_char(fecha_inicio, 'YYYY-MM-DD') AS fecha_inicio, to_char(fecha_fin, 'YYYY-MM-DD') AS fecha_fin
         FROM ciepi.mentor_bloqueos WHERE profesor_id = $1`,
        [id]
      ),
      query(
        `SELECT inicio, fin FROM ciepi.mentoria_reservas
         WHERE profesor_id = $1 AND fin > NOW()
           AND (estado = 'confirmada' OR (estado = 'pendiente_verificacion' AND pendiente_expira > NOW()))`,
        [id]
      ),
    ]);

    const turnos = generarTurnos({
      disponibilidad: disp.rows,
      bloqueos: bloqueos.rows,
      ocupados: ocupados.rows,
      duracionMin: prof.rows[0].duracion_mentoria_min,
      ahora: new Date(),
      dias,
      anticipacionHoras: ANTICIPACION_RESERVA_HORAS,
    });
    return NextResponse.json({ success: true, data: turnos, anticipacionHoras: ANTICIPACION_RESERVA_HORAS });
  } catch (error) {
    console.error("Error al calcular turnos:", error);
    return NextResponse.json({ success: false, error: "Error al calcular los turnos." }, { status: 500 });
  }
}
