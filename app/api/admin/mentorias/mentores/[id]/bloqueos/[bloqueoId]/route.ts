import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, parseId } from "@/lib/adminAuth";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; bloqueoId: string }> }
) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const p = await params;
  const id = parseId(p.id);
  const bloqueoId = parseId(p.bloqueoId);
  if (!id || !bloqueoId) return NextResponse.json({ success: false, error: "Datos no válidos." }, { status: 400 });

  try {
    const result = await query(`DELETE FROM ciepi.mentor_bloqueos WHERE id = $1 AND profesor_id = $2`, [bloqueoId, id]);
    if (result.rowCount === 0) {
      return NextResponse.json({ success: false, error: "Bloqueo no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error al eliminar bloqueo:", error);
    return NextResponse.json({ success: false, error: "Error al eliminar el bloqueo." }, { status: 500 });
  }
}
