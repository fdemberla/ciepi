import { NextRequest, NextResponse } from "next/server";
import { listarMentoresPublicos, cargarTurnosMentor } from "@/lib/mentoriasServer";
import { DIAS_RESERVABLES } from "@/lib/mentoriaSolicitud";
import { parseId } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/** Perfil público de un mentor y sus turnos libres. */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: "Mentor no válido." }, { status: 400 });
  try {
    const [mentor] = await listarMentoresPublicos(id);
    if (!mentor) return NextResponse.json({ success: false, error: "Mentor no encontrado." }, { status: 404 });
    const t = await cargarTurnosMentor(id, DIAS_RESERVABLES);
    return NextResponse.json({ success: true, data: { ...mentor, turnos: t?.turnos ?? [] } });
  } catch (error) {
    console.error("Error al cargar mentor público:", error);
    return NextResponse.json({ success: false, error: "No se pudo cargar el mentor." }, { status: 500 });
  }
}
