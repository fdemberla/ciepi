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

    const edificioId = parseId((await params).id);
    if (!edificioId) {
      return NextResponse.json({ success: false, error: "Edificio no encontrado" }, { status: 404 });
    }
    const body = await request.json();
    const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 150) : "";
    const codigo = typeof body.codigo === "string" && body.codigo.trim()
      ? body.codigo.trim().slice(0, 30)
      : null;
    // Si no llega como booleano se conserva el valor actual.
    const activo = typeof body.activo === "boolean" ? body.activo : null;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre del edificio es obligatorio." },
        { status: 400 },
      );
    }

    const result = await query(
      `UPDATE ciepi.edificios
       SET nombre = $1, codigo = $2, activo = COALESCE($3, activo), fecha_actualizacion = NOW()
       WHERE id = $4
       RETURNING *`,
      [nombre, codigo, activo, edificioId],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Edificio no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Edificio actualizado", data: result.rows[0] });
  } catch (error) {
    if ((error as { code?: string })?.code === "23505") {
      return NextResponse.json(
        { success: false, error: "Ya existe un edificio con ese nombre en la sede." },
        { status: 409 },
      );
    }
    console.error("[PUT /api/admin/edificios/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar el edificio", message: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}

/** Elimina el edificio solo si nada depende de él ni de sus aulas (409 si no). */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireArea("capacitaciones");
    if (!auth.ok) return auth.respuesta;

    const edificioId = parseId((await params).id);
    if (!edificioId) {
      return NextResponse.json({ success: false, error: "Edificio no encontrado" }, { status: 404 });
    }

    return await withTransaction((q) =>
      respuestaBorradoUbicacion(q, "edificio", edificioId, {
        tabla: "ciepi.edificios",
        noEncontrado: "Edificio no encontrado",
        eliminado: "Edificio eliminado",
        sujeto: "Este edificio (con sus aulas)",
        desactivar: "Desactívalo para que no se pueda elegir en nuevas capacitaciones.",
      }),
    );
  } catch (error) {
    const fk = respuestaErrorFk(error, "El edificio está en uso y no se puede eliminar. Desactívalo en su lugar.");
    if (fk) return fk;
    console.error("[DELETE /api/admin/edificios/[id]] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar el edificio", message: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}
