import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { safeErrorDetail } from "@/lib/apiError";
import { TRANSICIONES_INSCRIPCION, isValidInscripcionState } from "@/lib/inscripcionStates";

// GET - Catálogo de estados de inscripción (solo para mostrar nombres y descripciones).
// Las transiciones válidas de cada inscripción vienen en el listado (`transiciones`).
export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;
  try {
    const result = await query(
      `SELECT
        id,
        nombre,
        descripcion
      FROM ciepi.inscripciones_estados
      ORDER BY id`,
      []
    );

    return NextResponse.json({
      success: true,
      data: result.rows.map((row) => {
        const id = Number(row.id);
        return {
          id,
          nombre: row.nombre,
          descripcion: row.descripcion,
          // Estado final: sin transiciones normales (solo overrides de administrador).
          final: isValidInscripcionState(id)
            ? TRANSICIONES_INSCRIPCION[id].every((t) => t.override)
            : true,
        };
      }),
    });
  } catch (error) {
    console.error("Error obteniendo estados de inscripción:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno del servidor",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
