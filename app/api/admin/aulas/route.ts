import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";

const TIPOS_VALIDOS = ["aula", "laboratorio", "auditorio", "taller", "virtual"];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await request.json();
    const edificioId = Number(body.edificio_id);
    const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 100) : "";
    const capacidad = body.capacidad ? Number(body.capacidad) : null;
    const tipo = typeof body.tipo === "string" && TIPOS_VALIDOS.includes(body.tipo)
      ? body.tipo
      : "aula";

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
    return NextResponse.json(
      { success: false, error: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}
