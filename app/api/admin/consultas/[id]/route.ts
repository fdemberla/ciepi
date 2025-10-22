import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    // Verificar autenticación y permisos de admin
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const consultaQuery = `
      SELECT 
        c.id,
        c.nombre,
        c.email,
        c.telefono,
        c.tipo_consulta_id,
        tc.nombre as tipo_consulta,
        c.sede_id,
        sf.nombre as sede,
        c.area_formacion_id,
        af.nombre as area_formacion,
        c.curso_interes,
        c.comentarios,
        c.respuesta,
        c.respondido_por,
        u.nombre as respondido_por_nombre,
        c.fecha_respuesta,
        c.estado,
        c.fecha_creacion,
        c.fecha_actualizacion,
        c.recaptcha_score
      FROM ciepi.consultas c
      LEFT JOIN ciepi.tipos_consulta tc ON c.tipo_consulta_id = tc.id
      LEFT JOIN ciepi.sedes sf ON c.sede_id = sf.id
      LEFT JOIN ciepi.areas_formacion af ON c.area_formacion_id = af.id
      LEFT JOIN ciepi.usuarios_administradores u ON c.respondido_por = u.id
      WHERE c.id = $1
    `;

    const result = await query(consultaQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Consulta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error obteniendo consulta:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener consulta",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: Params) {
  try {
    // Verificar autenticación y permisos de admin
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const { respuesta, estado } = body;

    // Validar que al menos uno de los campos esté presente
    if (respuesta === undefined && estado === undefined) {
      return NextResponse.json(
        { error: "Se debe proporcionar respuesta o estado" },
        { status: 400 }
      );
    }

    // Validar estado si se proporciona
    const estadosValidos = ["pendiente", "en_proceso", "respondida", "cerrada"];
    if (estado && !estadosValidos.includes(estado)) {
      return NextResponse.json(
        {
          error:
            "Estado inválido. Debe ser: pendiente, en_proceso, respondida o cerrada",
        },
        { status: 400 }
      );
    }

    // Construir query de actualización dinámicamente
    const updates: string[] = [];
    const values: (string | number | null)[] = [];
    let paramIndex = 1;

    if (respuesta !== undefined) {
      updates.push(`respuesta = $${paramIndex}`);
      values.push(respuesta);
      paramIndex++;

      updates.push(`respondido_por = $${paramIndex}`);
      values.push(session.user.adminId || null);
      paramIndex++;

      updates.push(`fecha_respuesta = CURRENT_TIMESTAMP`);

      // Si se responde y no se especifica estado, cambiar a 'respondida'
      if (estado === undefined) {
        updates.push(`estado = 'respondida'`);
      }
    }

    if (estado !== undefined) {
      updates.push(`estado = $${paramIndex}`);
      values.push(estado);
      paramIndex++;
    }

    values.push(id);

    const updateQuery = `
      UPDATE ciepi.consultas
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex}
      RETURNING 
        id,
        nombre,
        email,
        respuesta,
        estado,
        fecha_respuesta,
        fecha_actualizacion
    `;

    const result = await query(updateQuery, values);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Consulta no encontrada" },
        { status: 404 }
      );
    }

    // TODO: Enviar email al usuario notificando la respuesta

    return NextResponse.json({
      success: true,
      message: "Consulta actualizada exitosamente",
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error actualizando consulta:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar consulta",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    // Verificar autenticación y permisos de admin
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      );
    }

    const { id } = await params;

    const deleteQuery = `
      DELETE FROM ciepi.consultas
      WHERE id = $1
      RETURNING id
    `;

    const result = await query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: "Consulta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Consulta eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error eliminando consulta:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al eliminar consulta",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
