import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";

/**
 * Listado completo para el portal de administración.
 * A diferencia de /api/capacitaciones (público), no oculta las capacitaciones
 * inactivas ni las que ya cerraron inscripción: el admin necesita entrar a
 * ellas para gestionar matrículas y marcar "Terminó curso".
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      );
    }

    const result = await query(
      `
      SELECT
        id,
        banner,
        nombre,
        descripcion,
        cantidad_horas,
        cantidad_participantes,
        archivo_adjunto,
        fecha_inicio_inscripcion,
        fecha_final_inscripcion,
        fecha_inicio_capacitacion,
        fecha_final_capacitacion,
        activo,
        fecha_creacion,
        fecha_actualizacion
      FROM ciepi.capacitaciones
      ORDER BY fecha_creacion DESC
    `,
      []
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error("Error al listar capacitaciones (admin):", error);
    return NextResponse.json(
      { success: false, error: "Error al cargar capacitaciones" },
      { status: 500 }
    );
  }
}
