import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, parseId } from "@/lib/adminAuth";
import { ANTICIPACION_RESERVA_HORAS } from "@/lib/mentorias";
import { cargarTurnosMentor } from "@/lib/mentoriasServer";

/**
 * Vista previa de los turnos que verá el público (mismo cálculo que la reserva
 * pública). ?dias=14 por defecto, máximo 60.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: "Profesor no válido." }, { status: 400 });
  const dias = Math.min(60, Math.max(1, Number(request.nextUrl.searchParams.get("dias")) || 14));

  try {
    const t = await cargarTurnosMentor(id, dias);
    if (!t) return NextResponse.json({ success: false, error: "Profesor no encontrado." }, { status: 404 });
    return NextResponse.json({ success: true, data: t.turnos, anticipacionHoras: ANTICIPACION_RESERVA_HORAS });
  } catch (error) {
    console.error("Error al calcular turnos:", error);
    return NextResponse.json({ success: false, error: "Error al calcular los turnos." }, { status: 500 });
  }
}
