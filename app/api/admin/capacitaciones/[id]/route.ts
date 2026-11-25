import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import { parseCapacitacionExtraFields } from "@/lib/capacitacionDetails";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string = "";
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    id = resolvedParams.id;

    console.log(
      `🔍 [GET /api/admin/capacitaciones/${id}] Fetching capacitacion`
    );

    const queryText = `
      SELECT 
        c.id,
        c.banner,
        c.nombre,
        c.descripcion,
        c.cantidad_horas,
        c.cantidad_participantes,
        c.archivo_adjunto,
        c.fecha_inicio_inscripcion,
        c.fecha_final_inscripcion,
        c.fecha_inicio_capacitacion,
        c.fecha_final_capacitacion,
        c.horario,
        c.modalidad,
        COALESCE(s.nombre, c.sede) AS sede,
        COALESCE(e.nombre, c.edificio) AS edificio,
        COALESCE(a.nombre, c.salon) AS salon,
        c.sede_id,
        c.edificio_id,
        c.aula_id,
        c.activo,
        c.fecha_creacion,
        c.fecha_actualizacion,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'dia_semana', ch.dia_semana,
                'hora_inicio', to_char(ch.hora_inicio, 'HH24:MI'),
                'hora_fin', to_char(ch.hora_fin, 'HH24:MI')
              )
              ORDER BY ch.dia_semana, ch.hora_inicio
            )
            FROM ciepi.capacitacion_horarios ch
            WHERE ch.capacitacion_id = c.id
          ),
          '[]'::json
        ) AS horarios,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', p.id,
                'nombre', p.nombre,
                'apellido', p.apellido,
                'especialidad', p.especialidad,
                'biografia', p.biografia
              )
              ORDER BY p.apellido, p.nombre
            )
            FROM ciepi.capacitacion_profesores cp
            JOIN ciepi.profesores p ON p.id = cp.profesor_id
            WHERE cp.capacitacion_id = c.id
          ),
          '[]'::json
        ) AS profesores
      FROM ciepi.capacitaciones c
      LEFT JOIN ciepi.sedes s ON s.id = c.sede_id
      LEFT JOIN ciepi.edificios e ON e.id = c.edificio_id
      LEFT JOIN ciepi.aulas a ON a.id = c.aula_id
      WHERE c.id = $1
    `;

    const result = await query(queryText, [id]);

    if (result.rows.length === 0) {
      console.log(`❌ Capacitacion ${id} not found`);
      return NextResponse.json(
        { success: false, error: "Capacitación no encontrada" },
        { status: 404 }
      );
    }

    console.log(`✅ Capacitacion ${id} found:`, result.rows[0].nombre);

    return NextResponse.json(
      {
        success: true,
        data: result.rows[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`❌ [GET /api/admin/capacitaciones/${id}] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener capacitación",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let id: string = "";
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) {
      return NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    id = resolvedParams.id;
    const formData = await request.formData();

    console.log(`🔍 [PUT /api/admin/capacitaciones/${id}] Processing update`);

    // Extract and validate required fields
    const nombre = formData.get("nombre") as string;
    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es obligatorio" },
        { status: 400 }
      );
    }

    // First, get the existing capacitacion to preserve old file paths if no new files uploaded
    const existingResult = await query(
      "SELECT banner, archivo_adjunto FROM ciepi.capacitaciones WHERE id = $1",
      [id]
    );

    if (existingResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Capacitación no encontrada" },
        { status: 404 }
      );
    }

    const existingData = existingResult.rows[0];

    // Extract files
    const bannerFile = formData.get("Banner") as File | null;
    const archivoAdjuntoFile = formData.get("archivoAdjunto") as File | null;

    console.log("📁 Files received:", {
      banner: bannerFile?.name,
      adjunto: archivoAdjuntoFile?.name,
    });

    // Use existing paths or save new files
    let bannerPath: string | null = existingData.banner;
    let archivoAdjuntoPath: string | null = existingData.archivo_adjunto;

    // Only update banner if a new file was uploaded
    if (bannerFile && bannerFile.size > 0) {
      const { saveFile } = await import("@/lib/fileUpload");
      bannerPath = await saveFile(bannerFile, "banners");
      console.log("✅ New banner saved:", bannerPath);
    }

    // Only update attachment if a new file was uploaded
    if (archivoAdjuntoFile && archivoAdjuntoFile.size > 0) {
      const { saveFile } = await import("@/lib/fileUpload");
      archivoAdjuntoPath = await saveFile(archivoAdjuntoFile, "attachments");
      console.log("✅ New attachment saved:", archivoAdjuntoPath);
    }

    // Extract other fields
    const descripcionStr = formData.get("descripcion") as string;
    let descripcion = null;

    if (descripcionStr) {
      try {
        descripcion = JSON.parse(descripcionStr);
      } catch {
        descripcion = descripcionStr;
      }
    }

    const cantidadHoras = formData.get("cantidadHoras")
      ? parseInt(formData.get("cantidadHoras") as string)
      : null;

    const cantidadParticipantes = formData.get("cantidad_participantes")
      ? parseInt(formData.get("cantidad_participantes") as string)
      : null;

    const fechaInicioInscripcion =
      (formData.get("fechaInicioInscripcion") as string) || null;
    const fechaFinalInscripcion =
      (formData.get("fechaFinalInscripcion") as string) || null;
    const fechaInicioCapacitacion =
      (formData.get("fechaInicioCapacitacion") as string) || null;
    const fechaFinalCapacitacion =
      (formData.get("fechaFinalCapacitacion") as string) || null;

    // Get activo status (default to existing or true)
    const activoStr = formData.get("activo") as string;
    const activo = activoStr ? activoStr === "true" || activoStr === "1" : true;

    const extraParsed = parseCapacitacionExtraFields(formData);
    if (!extraParsed.ok) {
      return NextResponse.json(
        { success: false, error: extraParsed.error },
        { status: 400 }
      );
    }
    const {
      horario,
      modalidad,
      sede,
      edificio,
      salon,
      sedeId,
      edificioId,
      aulaId,
      profesorIds,
      horarios,
    } = extraParsed.data;

    // Update in database
    const updateQuery = `
      UPDATE ciepi.capacitaciones
      SET 
        banner = $1,
        nombre = $2,
        descripcion = $3,
        cantidad_horas = $4,
        cantidad_participantes = $5,
        archivo_adjunto = $6,
        fecha_inicio_inscripcion = $7,
        fecha_final_inscripcion = $8,
        fecha_inicio_capacitacion = $9,
        fecha_final_capacitacion = $10,
        horario = $11,
        modalidad = $12,
        sede = $13,
        edificio = $14,
        salon = $15,
        sede_id = $16,
        edificio_id = $17,
        aula_id = $18,
        activo = $19,
        fecha_actualizacion = NOW()
      WHERE id = $20
      RETURNING *
    `;

    const values = [
      bannerPath,
      nombre,
      descripcion ? JSON.stringify(descripcion) : null,
      cantidadHoras,
      cantidadParticipantes,
      archivoAdjuntoPath,
      fechaInicioInscripcion,
      fechaFinalInscripcion,
      fechaInicioCapacitacion,
      fechaFinalCapacitacion,
      horario,
      modalidad,
      sede,
      edificio,
      salon,
      sedeId,
      edificioId,
      aulaId,
      activo,
      id,
    ];

    console.log("📊 Executing UPDATE query");

    const result = await query(updateQuery, values);

    await query(
      `DELETE FROM ciepi.capacitacion_profesores WHERE capacitacion_id = $1`,
      [id]
    );
    if (profesorIds.length > 0) {
      await query(
        `INSERT INTO ciepi.capacitacion_profesores (capacitacion_id, profesor_id)
         SELECT $1, unnest($2::int[])
         ON CONFLICT DO NOTHING`,
        [id, profesorIds]
      );
    }

    await query(
      `DELETE FROM ciepi.capacitacion_horarios WHERE capacitacion_id = $1`,
      [id]
    );
    for (const h of horarios) {
      await query(
        `INSERT INTO ciepi.capacitacion_horarios (capacitacion_id, dia_semana, hora_inicio, hora_fin)
         VALUES ($1, $2, $3, $4)`,
        [id, h.dia_semana, h.hora_inicio, h.hora_fin]
      );
    }

    console.log(`✅ Capacitación ${id} updated successfully`);

    return NextResponse.json(
      {
        success: true,
        message: "Capacitación actualizada exitosamente",
        data: result.rows[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`❌ [PUT /api/admin/capacitaciones/${id}] Error:`, error);

    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar capacitación",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
