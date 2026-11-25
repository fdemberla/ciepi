import { NextResponse } from "next/server";
import { listarMentoresPublicos, cargarTurnosMentor } from "@/lib/mentoriasServer";
import { DIAS_RESERVABLES } from "@/lib/mentoriaSolicitud";

export const dynamic = "force-dynamic";

/** Mentores públicos con su próximo turno libre. No expone datos de contacto. */
export async function GET() {
  try {
    const mentores = await listarMentoresPublicos();
    const conTurnos = await Promise.all(
      mentores.map(async (m) => {
        const t = await cargarTurnosMentor(m.id, DIAS_RESERVABLES);
        return {
          ...m,
          turnos_disponibles: t?.turnos.length ?? 0,
          proximo_turno: t?.turnos[0]?.inicio ?? null,
        };
      })
    );
    return NextResponse.json({ success: true, data: conTurnos });
  } catch (error) {
    console.error("Error al listar mentores públicos:", error);
    return NextResponse.json({ success: false, error: "No se pudieron cargar los mentores." }, { status: 500 });
  }
}
