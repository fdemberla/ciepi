import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/adminAuth";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireArea("capacitaciones");
    if (!auth.ok) return auth.respuesta;

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
    const pgCode = (error as { code?: string })?.code;
    if (pgCode === "23505") {
      return NextResponse.json({ success: false, error: "Ya existe un edificio con ese nombre en la sede." }, { status: 409 });
    }
    if (pgCode === "23503") {
      return NextResponse.json({ success: false, error: "La sede indicada no existe." }, { status: 400 });
    }
    console.error("[POST /api/admin/edificios] Error:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo crear.", message: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}
