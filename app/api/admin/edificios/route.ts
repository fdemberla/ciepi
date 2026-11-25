import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await request.json();
    const sedeId = Number(body.sede_id);
    const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 150) : "";
    const codigo = typeof body.codigo === "string" && body.codigo.trim()
      ? body.codigo.trim().slice(0, 30)
      : null;

    if (!Number.isInteger(sedeId) || sedeId <= 0 || !nombre) {
      return NextResponse.json(
        { success: false, error: "Sede y nombre del edificio son obligatorios." },
        { status: 400 },
      );
    }

    const result = await query(
      `INSERT INTO ciepi.edificios (sede_id, nombre, codigo, activo)
       VALUES ($1, $2, $3, true)
       RETURNING *`,
      [sedeId, nombre, codigo],
    );

    return NextResponse.json(
      { success: true, message: "Edificio creado exitosamente", data: result.rows[0] },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}
