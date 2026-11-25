import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, requireArea } from "@/lib/adminAuth";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";

export async function GET(request: NextRequest) {
  try {
    const noAutorizado = await requireAdmin();
    if (noAutorizado) return noAutorizado;

    const soloActivos = request.nextUrl.searchParams.get("activo") === "true";
    const result = await query(
      `SELECT id, nombre, apellido, correo, telefono, especialidad, biografia, activo,
              (cedula IS NOT NULL) AS tiene_cedula,
              fecha_creacion, fecha_actualizacion
       FROM ciepi.profesores
       ${soloActivos ? "WHERE activo = true" : ""}
       ORDER BY apellido ASC, nombre ASC`,
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("[GET /api/admin/profesores] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener profesores",
        message: safeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireArea("capacitaciones");
    if (!auth.ok) return auth.respuesta;

    const body = await request.json();
    const nombre = typeof body.nombre === "string" ? body.nombre.trim().slice(0, 120) : "";
    const apellido = typeof body.apellido === "string" ? body.apellido.trim().slice(0, 120) : "";
    const cedula = typeof body.cedula === "string" && body.cedula.trim()
      ? body.cedula.trim().toUpperCase().slice(0, 50)
      : null;
    const correo = typeof body.correo === "string" && body.correo.trim()
      ? body.correo.trim().toLowerCase().slice(0, 255)
      : null;
    const telefono = typeof body.telefono === "string" && body.telefono.trim()
      ? body.telefono.trim().slice(0, 50)
      : null;
    const especialidad = typeof body.especialidad === "string" && body.especialidad.trim()
      ? body.especialidad.trim().slice(0, 200)
      : null;
    const biografia = typeof body.biografia === "string" && body.biografia.trim()
      ? body.biografia.trim()
      : null;

    if (!nombre || !apellido) {
      return NextResponse.json(
        { success: false, error: "Nombre y apellido son obligatorios." },
        { status: 400 },
      );
    }

    const result = await query(
      `INSERT INTO ciepi.profesores (nombre, apellido, cedula, correo, telefono, especialidad, biografia)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, nombre, apellido, correo, telefono, especialidad, biografia, activo,
                 (cedula IS NOT NULL) AS tiene_cedula, fecha_creacion, fecha_actualizacion`,
      [nombre, apellido, cedula, correo, telefono, especialidad, biografia],
    );

    return NextResponse.json(
      {
        success: true,
        message: "Profesor creado exitosamente",
        data: result.rows[0],
      },
      { status: 201 },
    );
  } catch (error) {
    const pgCode = (error as { code?: string })?.code;
    if (pgCode === "23505") {
      return NextResponse.json(
        {
          success: false,
          error: "Ya existe un profesor registrado con esa cédula o correo.",
        },
        { status: 409 },
      );
    }
    console.error("[POST /api/admin/profesores] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al crear profesor",
        message: safeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}
