import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";

const TIPOS_VALIDOS = ["aula", "laboratorio", "auditorio", "taller", "virtual"];

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
    const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 100) : "";
    const capacidad = body.capacidad ? Number(body.capacidad) : null;
    const tipo = typeof body.tipo === "string" && TIPOS_VALIDOS.includes(body.tipo)
      ? body.tipo
      : "aula";
    const activo = typeof body.activo === "boolean" ? body.activo : true;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre del aula es obligatorio." },
        { status: 400 },
      );
    }

    const result = await query(
      `UPDATE ciepi.aulas
       SET nombre = $1, capacidad = $2, tipo = $3, activo = $4, fecha_actualizacion = NOW()
       WHERE id = $5
       RETURNING *`,
      [nombre, capacidad, tipo, activo, id],
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Aula no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Aula actualizada", data: result.rows[0] });
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
    const result = await query(`DELETE FROM ciepi.aulas WHERE id = $1 RETURNING id`, [id]);
    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Aula no encontrada" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Aula eliminada" });
  } catch (error) {
    return NextResponse.json({ success: false, error: safeErrorDetail(error) }, { status: 500 });
  }
}
