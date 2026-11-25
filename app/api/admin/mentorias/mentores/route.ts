import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

/** Profesores con sus datos de mentor (para activar y configurar mentores). */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const result = await query(
      `SELECT p.id, p.nombre, p.apellido, p.especialidad, p.correo, p.activo,
              p.es_mentor, p.foto, p.duracion_mentoria_min,
              COALESCE(
                (SELECT json_agg(a.nombre ORDER BY a.nombre)
                 FROM ciepi.mentor_areas ma JOIN ciepi.mentoria_areas a ON a.id = ma.area_id
                 WHERE ma.profesor_id = p.id),
                '[]'::json
              ) AS areas,
              (SELECT COUNT(*)::int FROM ciepi.mentor_disponibilidad d WHERE d.profesor_id = p.id) AS bloques
       FROM ciepi.profesores p
       WHERE p.activo = true OR p.es_mentor = true
       ORDER BY p.es_mentor DESC, p.apellido, p.nombre`,
      []
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error al listar mentores:", error);
    return NextResponse.json({ success: false, error: "Error al cargar los mentores." }, { status: 500 });
  }
}
