import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

// GET - Obtener estudiantes inscritos en una capacitación
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const capacitacionId = parseInt(id, 10);

    if (isNaN(capacitacionId)) {
      return NextResponse.json(
        { error: "ID de capacitación inválido" },
        { status: 400 }
      );
    }

    // Verificar que la capacitación existe
    const capacitacionResult = await query(
      "SELECT id, nombre FROM ciepi.capacitaciones WHERE id = $1",
      [capacitacionId]
    );

    if (capacitacionResult.rows.length === 0) {
      return NextResponse.json(
        { error: "Capacitación no encontrada" },
        { status: 404 }
      );
    }

    // Obtener estudiantes inscritos con información completa
    const estudiantesResult = await query(
      `SELECT 
        i.id as inscripcion_id,
        i.estado_inscripcion,
        i.fecha_inscripcion,
        i.fecha_ultima_actualizacion,
        e.id as estudiante_id,
        e.cedula,
        e.nombres,
        e.apellidos,
        e.nombre_cedula,
        e.sexo,
        e.estado_civil,
        e.fecha_nacimiento,
        e.correo,
        e.telefono,
        e.correo_verificado,
        e.fecha_creacion as estudiante_fecha_registro,
        est.nombre as estado_nombre,
        est.descripcion as estado_descripcion,
        ub.provincia_id,
        ub.distrito_id,
        ub.corregimiento_id,
        ub.calle,
        p.nombre as provincia_nombre,
        d.nombre as distrito_nombre,
        c.nombre as corregimiento_nombre
      FROM ciepi.inscripciones i
      INNER JOIN ciepi.estudiantes e ON i.id_usuario = e.id
      INNER JOIN ciepi.inscripciones_estados est ON i.estado_inscripcion = est.id
      LEFT JOIN ciepi.estudiantes_ubicacion ub ON e.id = ub.id_usuario
      LEFT JOIN ciepi.provincias p ON ub.provincia_id = p.id
      LEFT JOIN ciepi.distritos d ON ub.distrito_id = d.id
      LEFT JOIN ciepi.corregimientos c ON ub.corregimiento_id = c.id
      WHERE i.id_capacitacion = $1
      ORDER BY i.fecha_inscripcion DESC`,
      [capacitacionId]
    );

    // Formatear los datos para una mejor estructura
    const estudiantes = estudiantesResult.rows.map((row) => ({
      inscripcion: {
        id: row.inscripcion_id,
        estado: {
          id: row.estado_inscripcion,
          nombre: row.estado_nombre,
          descripcion: row.estado_descripcion,
        },
        fecha_inscripcion: row.fecha_inscripcion,
        fecha_ultima_actualizacion: row.fecha_ultima_actualizacion,
      },
      estudiante: {
        id: row.estudiante_id,
        cedula: row.cedula,
        nombres: row.nombres,
        apellidos: row.apellidos,
        nombre_cedula: row.nombre_cedula,
        sexo: row.sexo,
        estado_civil: row.estado_civil,
        fecha_nacimiento: row.fecha_nacimiento,
        correo: row.correo,
        telefono: row.telefono,
        correo_verificado: row.correo_verificado,
        fecha_registro: row.estudiante_fecha_registro,
      },
      ubicacion: row.provincia_id
        ? {
            provincia: {
              id: row.provincia_id,
              nombre: row.provincia_nombre,
            },
            distrito: row.distrito_id
              ? {
                  id: row.distrito_id,
                  nombre: row.distrito_nombre,
                }
              : null,
            corregimiento: row.corregimiento_id
              ? {
                  id: row.corregimiento_id,
                  nombre: row.corregimiento_nombre,
                }
              : null,
            calle: row.calle,
          }
        : null,
    }));

    // Obtener estadísticas de inscripciones por estado
    const estadisticasResult = await query(
      `SELECT 
        est.id,
        est.nombre,
        est.descripcion,
        COUNT(i.id) as cantidad
      FROM ciepi.inscripciones_estados est
      LEFT JOIN ciepi.inscripciones i ON est.id = i.estado_inscripcion AND i.id_capacitacion = $1
      GROUP BY est.id, est.nombre, est.descripcion
      ORDER BY est.id`,
      [capacitacionId]
    );

    const estadisticas = estadisticasResult.rows.reduce(
      (acc, row) => {
        acc[row.nombre.toLowerCase().replace(/\s+/g, "_")] = {
          id: row.id,
          nombre: row.nombre,
          descripcion: row.descripcion,
          cantidad: parseInt(row.cantidad, 10),
        };
        return acc;
      },
      {} as Record<
        string,
        {
          id: number;
          nombre: string;
          descripcion: string;
          cantidad: number;
        }
      >
    );

    return NextResponse.json({
      success: true,
      data: {
        capacitacion: {
          id: capacitacionId,
          nombre: capacitacionResult.rows[0].nombre,
        },
        estudiantes,
        estadisticas,
        totales: {
          total_inscritos: estudiantes.length,
          con_correo_verificado: estudiantes.filter(
            (e) => e.estudiante.correo_verificado
          ).length,
          sin_correo_verificado: estudiantes.filter(
            (e) => !e.estudiante.correo_verificado
          ).length,
        },
      },
    });
  } catch (error) {
    console.error("Error obteniendo estudiantes:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
