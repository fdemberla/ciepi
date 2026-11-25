import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, parseId } from "@/lib/adminAuth";

/** Renombra un área o la activa/desactiva (no se borran: conservan el historial de reservas). */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: "Área no válida." }, { status: 400 });

  try {
    const body = await request.json().catch(() => ({}));
    const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 120) : null;
    const activo = typeof body.activo === "boolean" ? body.activo : null;
    if (nombre === "") {
      return NextResponse.json({ success: false, error: "El nombre no puede quedar vacío." }, { status: 400 });
    }
    const result = await query(
      `UPDATE ciepi.mentoria_areas
       SET nombre = COALESCE($1, nombre), activo = COALESCE($2, activo)
       WHERE id = $3
       RETURNING id, nombre, activo`,
      [nombre, activo, id]
    );
    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Área no encontrada." }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json({ success: false, error: "Ya existe un área con ese nombre." }, { status: 409 });
    }
    console.error("Error al actualizar área de mentoría:", error);
    return NextResponse.json({ success: false, error: "Error al actualizar el área." }, { status: 500 });
  }
}
