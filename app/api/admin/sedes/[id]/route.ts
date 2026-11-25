import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { parseId, requireArea } from "@/lib/adminAuth";
import { respuestaBorradoUbicacion, respuestaErrorFk } from "@/lib/capacitacionesServer";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireArea("capacitaciones");
    if (!auth.ok) return auth.respuesta;

    const sedeId = parseId((await params).id);
    if (!sedeId) {
      return NextResponse.json({ success: false, error: "Sede no encontrada" }, { status: 404 });
    }
    const body = await request.json();
    const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 150) : "";
    const codigo = typeof body.codigo === "string" && body.codigo.trim()
      ? body.codigo.trim().slice(0, 30)
      : null;
    const direccion = typeof body.direccion === "string" && body.direccion.trim()
      ? body.direccion.trim()
      : null;
    const telefono = typeof body.telefono === "string" && body.telefono.trim()
      ? body.telefono.trim().slice(0, 50)
      : null;
    // Si no llega como booleano se conserva el valor actual (antes se reactivaba).
    const activo = typeof body.activo === "boolean" ? body.activo : null;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre de la sede es obligatorio." },
        { status: 400 },
      );
    }

    const result = await query(
      `UPDATE ciepi.sedes
       SET nombre = $1, codigo = $2, direccion = $3, telefono = $4,
           activo = COALESCE($5, activo), fecha_actualizacion = NOW()
       WHERE id = $6
       RETURNING *`,
      [nombre, codigo, direccion, telefono, activo, sedeId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Sede no encontrada" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Sede actualizada exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("[PUT /api/admin/sedes/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar la sede", message: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}

/**
 * Elimina una sede solo si nada depende de ella ni de sus edificios y aulas
 * (capacitaciones, horarios de mentores, reservas de mentoría activas).
 * Si hay dependencias responde 409 y recomienda desactivarla.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireArea("capacitaciones");
    if (!auth.ok) return auth.respuesta;

    const sedeId = parseId((await params).id);
    if (!sedeId) {
      return NextResponse.json({ success: false, error: "Sede no encontrada" }, { status: 404 });
    }

    return await withTransaction((q) =>
      respuestaBorradoUbicacion(q, "sede", sedeId, {
        tabla: "ciepi.sedes",
        noEncontrado: "Sede no encontrada",
        eliminado: "Sede eliminada exitosamente",
        sujeto: "Esta sede (con sus edificios y aulas)",
        desactivar: "Desactívala para que no se pueda elegir en nuevas capacitaciones o mentorías.",
      }),
    );
  } catch (error) {
    const fk = respuestaErrorFk(error, "La sede está en uso y no se puede eliminar. Desactívala en su lugar.");
    if (fk) return fk;
    console.error("[DELETE /api/admin/sedes/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar la sede", message: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}
