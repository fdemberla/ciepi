import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import {
  ArchivoNoValidoError,
  deleteSavedFile,
  saveFile,
  validarArchivoParaCarpeta,
} from "@/lib/fileUpload";
import { safeErrorDetail } from "@/lib/apiError";
import { requireArea } from "@/lib/adminAuth";
import {
  parseCapacitacionBaseFields,
  parseCapacitacionExtraFields,
} from "@/lib/capacitacionDetails";
import {
  ErrorReferenciaCapacitacion,
  guardarHijosCapacitacion,
  validarReferenciasCapacitacion,
} from "@/lib/capacitacionesServer";

export async function POST(request: NextRequest) {
  const archivosGuardados: string[] = [];
  try {
    const auth = await requireArea("capacitaciones");
    if (!auth.ok) return auth.respuesta;

    const formData = await request.formData();

    // 1. Validar TODO antes de escribir nada (campos, fechas, horarios y archivos).
    const base = parseCapacitacionBaseFields(formData);
    if (!base.ok) {
      return NextResponse.json({ success: false, error: base.error }, { status: 400 });
    }
    const extra = parseCapacitacionExtraFields(formData);
    if (!extra.ok) {
      return NextResponse.json({ success: false, error: extra.error }, { status: 400 });
    }

    const bannerFile = formData.get("Banner");
    const archivoAdjuntoFile = formData.get("archivoAdjunto");
    const banner = bannerFile instanceof File && bannerFile.size > 0 ? bannerFile : null;
    const adjunto =
      archivoAdjuntoFile instanceof File && archivoAdjuntoFile.size > 0 ? archivoAdjuntoFile : null;
    if (banner) await validarArchivoParaCarpeta(banner, "banners");
    if (adjunto) await validarArchivoParaCarpeta(adjunto, "attachments");

    const {
      nombre,
      descripcion,
      cantidadHoras,
      cantidadParticipantes,
      fechaInicioInscripcion,
      fechaFinalInscripcion,
      fechaInicioCapacitacion,
      fechaFinalCapacitacion,
    } = base.data;
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
    } = extra.data;

    // 2. Guardar archivos (si la transacción falla se borran).
    const bannerPath = banner ? await saveFile(banner, "banners") : null;
    if (bannerPath) archivosGuardados.push(bannerPath);
    const archivoAdjuntoPath = adjunto ? await saveFile(adjunto, "attachments") : null;
    if (archivoAdjuntoPath) archivosGuardados.push(archivoAdjuntoPath);

    // 3. Capacitación + profesores + horarios en una sola transacción: o se guarda
    //    todo o nada (antes un error en los horarios dejaba la capacitación creada y
    //    el admin, al reintentar, la duplicaba).
    const creada = await withTransaction(async (q) => {
      await validarReferenciasCapacitacion(q, { sedeId, edificioId, aulaId, profesorIds });

      const result = await q(
        `INSERT INTO ciepi.capacitaciones (
          banner, nombre, descripcion, cantidad_horas, cantidad_participantes,
          archivo_adjunto, fecha_inicio_inscripcion, fecha_final_inscripcion,
          fecha_inicio_capacitacion, fecha_final_capacitacion, horario, modalidad,
          sede, edificio, salon, sede_id, edificio_id, aula_id, activo
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true)
        RETURNING *`,
        [
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
        ]
      );
      const fila = result.rows[0];
      await guardarHijosCapacitacion(q, fila.id, profesorIds, horarios, false);
      return fila;
    });

    return NextResponse.json(
      {
        success: true,
        message: "Capacitación creada exitosamente",
        data: creada,
      },
      { status: 201 }
    );
  } catch (error) {
    await Promise.all(archivosGuardados.map(deleteSavedFile));
    if (error instanceof ArchivoNoValidoError || error instanceof ErrorReferenciaCapacitacion) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("[POST /api/admin/capacitaciones/crear] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al crear capacitación",
        message: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
