import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";

/** Catálogo de áreas de mentoría, con cuántos mentores atiende cada una. */
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const result = await query(
      `SELECT a.id, a.nombre, a.activo,
              (SELECT COUNT(*)::int FROM ciepi.mentor_areas ma WHERE ma.area_id = a.id) AS mentores
       FROM ciepi.mentoria_areas a
       ORDER BY a.activo DESC, a.nombre`,
      []
    );
    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error al listar áreas de mentoría:", error);
    return NextResponse.json({ success: false, error: "Error al cargar las áreas." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const body = await request.json().catch(() => ({}));
    const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 120) : "";
    if (!nombre) {
      return NextResponse.json({ success: false, error: "Escribe el nombre del área." }, { status: 400 });
    }
    const result = await query(
      `INSERT INTO ciepi.mentoria_areas (nombre) VALUES ($1)
       ON CONFLICT (nombre) DO NOTHING
       RETURNING id, nombre, activo`,
      [nombre]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Ya existe un área con ese nombre." }, { status: 409 });
    }
    return NextResponse.json({ success: true, data: { ...result.rows[0], mentores: 0 } }, { status: 201 });
  } catch (error) {
    console.error("Error al crear área de mentoría:", error);
    return NextResponse.json({ success: false, error: "Error al crear el área." }, { status: 500 });
  }
}
