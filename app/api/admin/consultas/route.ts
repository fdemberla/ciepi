import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { parseId } from "@/lib/adminAuth";
import { esEstadoConsulta, puedeEliminarConsulta, transicionesConsulta } from "@/lib/estados/consulta";

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación y permisos de admin
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.isAdmin || !session.user.adminId) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      );
    }

    // Rol leído de la BD (el del JWT puede estar desactualizado); define las acciones por fila.
    const rolResult = await query(
      `SELECT rol_id FROM ciepi.usuarios_administradores WHERE id = $1 AND activo = true`,
      [session.user.adminId]
    );
    if (rolResult.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Usuario administrador no activo." }, { status: 403 });
    }
    const rol = Number(rolResult.rows[0].rol_id);

    // Obtener parámetros de búsqueda
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get("page") || "1"), 1);
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "10"), 1), 100);
    const search = (searchParams.get("search") || "").slice(0, 100);
    const estado = searchParams.get("estado") || "";
    const tipoConsulta = searchParams.get("tipo_consulta_id") || "";

    if (estado && !esEstadoConsulta(estado)) {
      return NextResponse.json({ success: false, error: "Filtro de estado no válido." }, { status: 400 });
    }
    if (tipoConsulta && !parseId(tipoConsulta)) {
      return NextResponse.json({ success: false, error: "Filtro de tipo no válido." }, { status: 400 });
    }

    const offset = (page - 1) * limit;

    // Construir query con filtros
    const whereConditions = [];
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    if (search) {
      whereConditions.push(
        `(c.nombre ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex} OR c.comentarios ILIKE $${paramIndex})`
      );
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (estado) {
      whereConditions.push(`c.estado = $${paramIndex}`);
      queryParams.push(estado);
      paramIndex++;
    }

    if (tipoConsulta) {
      whereConditions.push(`c.tipo_consulta_id = $${paramIndex}`);
      queryParams.push(Number(tipoConsulta));
      paramIndex++;
    }

    const whereClause =
      whereConditions.length > 0
        ? `WHERE ${whereConditions.join(" AND ")}`
        : "";

    // Query para obtener consultas con información relacionada
    const consultasQuery = `
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
        c.fecha_actualizacion
      FROM ciepi.consultas c
      LEFT JOIN ciepi.tipos_consulta tc ON c.tipo_consulta_id = tc.id
      LEFT JOIN ciepi.sedes sf ON c.sede_id = sf.id
      LEFT JOIN ciepi.areas_formacion af ON c.area_formacion_id = af.id
      LEFT JOIN ciepi.usuarios_administradores u ON c.respondido_por = u.id
      ${whereClause}
      ORDER BY 
        CASE 
          WHEN c.estado = 'pendiente' THEN 1
          WHEN c.estado = 'en_proceso' THEN 2
          WHEN c.estado = 'respondida' THEN 3
          ELSE 4
        END,
        c.fecha_creacion DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM ciepi.consultas c
      ${whereClause}
    `;

    const [consultasResult, countResult] = await Promise.all([
      query(consultasQuery, queryParams.slice(0, -2).concat([limit, offset])),
      query(countQuery, queryParams.slice(0, -2)),
    ]);

    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: consultasResult.rows.map((c) => ({
        ...c,
        transiciones: transicionesConsulta(c.estado, rol),
      })),
      permisos: { eliminar: puedeEliminarConsulta(rol) },
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Error obteniendo consultas:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener consultas",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
