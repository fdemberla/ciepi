import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import {
  expandCapacitacionesToMonthEvents,
  type CapacitacionCalendarSource,
} from "@/lib/calendarUtils";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const sp = request.nextUrl.searchParams;
    const monthParam = sp.get("month"); // YYYY-MM
    const sedeIdParam = sp.get("sedeId");
    const modalidadParam = sp.get("modalidad");

    const now = new Date();
    let year = now.getFullYear();
    let monthIndex0 = now.getMonth();

    if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
      const [y, m] = monthParam.split("-").map(Number);
      if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12) {
        year = y;
        monthIndex0 = m - 1;
      }
    }

    const conditions = ["c.activo = true"];
    const params: unknown[] = [];

    if (sedeIdParam && /^\d+$/.test(sedeIdParam)) {
      params.push(Number(sedeIdParam));
      conditions.push(`c.sede_id = $${params.length}`);
    }

    if (
      modalidadParam &&
      ["presencial", "virtual", "hibrida"].includes(modalidadParam)
    ) {
      params.push(modalidadParam);
      conditions.push(`c.modalidad = $${params.length}`);
    }

    const result = await query(
      `SELECT
         c.id,
         c.nombre,
         c.modalidad,
         c.fecha_inicio_capacitacion,
         c.fecha_final_capacitacion,
         c.sede,
         c.edificio,
         c.salon,
         s.nombre AS sede_nombre,
         e.nombre AS edificio_nombre,
         a.nombre AS aula_nombre,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object(
                 'dia_semana', ch.dia_semana,
                 'hora_inicio', ch.hora_inicio,
                 'hora_fin', ch.hora_fin
               )
               ORDER BY ch.dia_semana, ch.hora_inicio
             )
             FROM ciepi.capacitacion_horarios ch
             WHERE ch.capacitacion_id = c.id
           ),
           '[]'::json
         ) AS horarios,
         COALESCE(
           (
             SELECT json_agg(
               json_build_object('nombre', p.nombre, 'apellido', p.apellido)
               ORDER BY p.apellido, p.nombre
             )
             FROM ciepi.capacitacion_profesores cp
             JOIN ciepi.profesores p ON p.id = cp.profesor_id
             WHERE cp.capacitacion_id = c.id
           ),
           '[]'::json
         ) AS profesores
       FROM ciepi.capacitaciones c
       LEFT JOIN ciepi.sedes s ON s.id = c.sede_id
       LEFT JOIN ciepi.edificios e ON e.id = c.edificio_id
       LEFT JOIN ciepi.aulas a ON a.id = c.aula_id
       WHERE ${conditions.join(" AND ")}`,
      params,
    );

    const events = expandCapacitacionesToMonthEvents(
      result.rows as CapacitacionCalendarSource[],
      year,
      monthIndex0,
    );

    return NextResponse.json({
      success: true,
      year,
      month: monthIndex0 + 1,
      events,
    });
  } catch (error) {
    console.error("[GET /api/admin/calendario] Error:", error);
    return NextResponse.json(
      { success: false, error: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}
