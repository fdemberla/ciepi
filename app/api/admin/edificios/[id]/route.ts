import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 150) : "";
    const codigo = typeof body.codigo === "string" && body.codigo.trim()
      ? body.codigo.trim().slice(0, 30)
      : null;
    const activo = typeof body.activo === "boolean" ? body.activo : true;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre del edificio es obligatorio." },
        { status: 400 },
      );
    }

    const result = await query(
      `UPDATE ciepi.edificios
       SET nombre = $1, codigo = $2, activo = $3, fecha_actualizacion = NOW()
       WHERE id = $4
       RETURNING *`,
      [nombre, codigo, activo, id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Edificio no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Edificio actualizado", data: result.rows[0] });
  } catch (error) {
    return NextResponse.json({ success: false, error: safeErrorDetail(error) }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { id } = await params;
    const result = await query(`DELETE FROM ciepi.edificios WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Edificio no encontrado" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Edificio eliminado" });
  } catch (error) {
    return NextResponse.json({ success: false, error: safeErrorDetail(error) }, { status: 500 });
  }
}
