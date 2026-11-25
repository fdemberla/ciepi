import { NextRequest, NextResponse } from "next/server";
import { requireArea } from "@/lib/adminAuth";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";

const TIPOS_VALIDOS = ["aula", "laboratorio", "auditorio", "taller", "virtual"];

export async function POST(request: NextRequest) {
  try {
    const auth = await requireArea("capacitaciones");
    if (!auth.ok) return auth.respuesta;

    const body = await request.json();
    const edificioId = Number(body.edificio_id);
    const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 100) : "";
    const capacidad = body.capacidad ? Number(body.capacidad) : null;
    const tipo = typeof body.tipo === "string" && TIPOS_VALIDOS.includes(body.tipo)
      ? body.tipo
      : "aula";

    if (capacidad !== null && (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 100000)) {
      return NextResponse.json(
        { success: false, error: "La capacidad debe ser un número entero positivo." },
        { status: 400 },
      );
    }

    if (!Number.isInteger(edificioId) || edificioId <= 0 || !nombre) {
      return NextResponse.json(
        { success: false, error: "Edificio y nombre del aula son obligatorios." },
        { status: 400 },
      );
    }

    const result = await query(
      `INSERT INTO ciepi.aulas (edificio_id, nombre, capacidad, tipo, activo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [edificioId, nombre, capacidad, tipo],
    );

    return NextResponse.json(
      { success: true, message: "Aula creada exitosamente", data: result.rows[0] },
      { status: 201 },
    );
  } catch (error) {
    const pgCode = (error as { code?: string })?.code;
    if (pgCode === "23505") {
      return NextResponse.json({ success: false, error: "Ya existe un aula con ese nombre en el edificio." }, { status: 409 });
    }
    if (pgCode === "23503") {
      return NextResponse.json({ success: false, error: "El edificio indicado no existe." }, { status: 400 });
    }
    console.error("[POST /api/admin/aulas] Error:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo crear.", message: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}
