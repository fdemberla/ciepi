import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 },
      );
    }

    const result = await query(`
      SELECT
        s.id,
        s.nombre,
        s.codigo,
        s.direccion,
        s.telefono,
        s.activo,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', e.id,
                'sede_id', e.sede_id,
                'nombre', e.nombre,
                'codigo', e.codigo,
                'activo', e.activo,
                'aulas', COALESCE(
                  (
                    SELECT json_agg(
                      json_build_object(
                        'id', a.id,
                        'edificio_id', a.edificio_id,
                        'nombre', a.nombre,
                        'capacidad', a.capacidad,
                        'tipo', a.tipo,
                        'activo', a.activo
                      )
                      ORDER BY a.nombre
                    )
                    FROM ciepi.aulas a
                    WHERE a.edificio_id = e.id
                  ),
                  '[]'::json
                )
              )
              ORDER BY e.nombre
            )
            FROM ciepi.edificios e
            WHERE e.sede_id = s.id
          ),
          '[]'::json
        ) AS edificios
      FROM ciepi.sedes s
      ORDER BY s.nombre ASC
    `);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("[GET /api/admin/sedes] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener sedes",
        message: safeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 },
      );
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

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre de la sede es obligatorio." },
        { status: 400 },
      );
    }

    const result = await query(
      `INSERT INTO ciepi.sedes (nombre, codigo, direccion, telefono, activo)
       VALUES ($1, $2, $3, $4, true)
       RETURNING *`,
      [nombre, codigo, direccion, telefono],
    );

    return NextResponse.json(
      {
        success: true,
        message: "Sede creada exitosamente",
        data: result.rows[0],
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[POST /api/admin/sedes] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al crear sede",
        message: safeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}
