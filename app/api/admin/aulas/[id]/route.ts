import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { parseId, requireArea } from "@/lib/adminAuth";
import { respuestaBorradoUbicacion, respuestaErrorFk } from "@/lib/capacitacionesServer";

const TIPOS_VALIDOS = ["aula", "laboratorio", "auditorio", "taller", "virtual"];

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireArea("capacitaciones");
    if (!auth.ok) return auth.respuesta;

    const aulaId = parseId((await params).id);
    if (!aulaId) {
      return NextResponse.json({ success: false, error: "Aula no encontrada" }, { status: 404 });
    }
    const body = await request.json();
    const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 100) : "";
    const capacidad = body.capacidad ? Number(body.capacidad) : null;
    const tipo = typeof body.tipo === "string" && TIPOS_VALIDOS.includes(body.tipo)
      ? body.tipo
      : "aula";
    // Si no llega como booleano se conserva el valor actual.
    const activo = typeof body.activo === "boolean" ? body.activo : null;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre del aula es obligatorio." },
        { status: 400 },
      );
    }
    if (capacidad !== null && (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 100000)) {
      return NextResponse.json(
        { success: false, error: "La capacidad debe ser un número entero positivo." },
        { status: 400 },
      );
    }

    const result = await query(
      `UPDATE ciepi.aulas
       SET nombre = $1, capacidad = $2, tipo = $3, activo = COALESCE($4, activo), fecha_actualizacion = NOW()
       WHERE id = $5
       RETURNING *`,
      [nombre, capacidad, tipo, activo, aulaId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Aula no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Aula actualizada", data: result.rows[0] });
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      return NextResponse.json(
        { success: false, error: "Ya existe un aula con ese nombre en el edificio." },
        { status: 409 },
      );
    }
    console.error("[PUT /api/admin/aulas/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar el aula", message: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}

/** Elimina el aula solo si no la usan capacitaciones, horarios de mentores ni reservas activas (409 si no). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireArea("capacitaciones");
    if (!auth.ok) return auth.respuesta;

    const aulaId = parseId((await params).id);
    if (!aulaId) {
      return NextResponse.json({ success: false, error: "Aula no encontrada" }, { status: 404 });
    }

    return await withTransaction((q) =>
      respuestaBorradoUbicacion(q, "aula", aulaId, {
        tabla: "ciepi.aulas",
        noEncontrado: "Aula no encontrada",
        eliminado: "Aula eliminada",
        sujeto: "Esta aula",
        desactivar: "Desactívala para que no se pueda elegir en nuevas capacitaciones.",
      }),
    );
  } catch (error) {
    const fk = respuestaErrorFk(error, "El aula está en uso y no se puede eliminar. Desactívala en su lugar.");
    if (fk) return fk;
    console.error("[DELETE /api/admin/aulas/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar el aula", message: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}
