import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { parseId, requireArea } from "@/lib/adminAuth";
import {
  describirDependencias,
  ESTADOS_RESERVA_ACTIVA,
  respuestaErrorFk,
} from "@/lib/capacitacionesServer";
import { MOTIVO_MENTOR_NO_DISPONIBLE } from "@/lib/estados/mentoriaReserva";
import { respuestaErrorTransicion } from "@/lib/estadosServer";
import {
  aplicarDesactivacionMentor,
  ErrorReservasActivas,
  type ReservaCanceladaPorMentor,
} from "@/lib/mentoriasServer";
import { enviarCancelacionesPorMentor } from "@/lib/mentoriasEmails";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireArea("capacitaciones");
    if (!auth.ok) return auth.respuesta;

    const { id } = await params;
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
    // Si no llega como booleano se conserva el valor actual (antes se reactivaba por defecto).
    const activo = typeof body.activo === "boolean" ? body.activo : null;
    const cancelarReservas = body.cancelar_reservas === true;

    if (!nombre || !apellido) {
      return NextResponse.json(
        { success: false, error: "Nombre y apellido son obligatorios." },
        { status: 400 },
      );
    }

    const profesorId = parseId(String(id));
    if (!profesorId) {
      return NextResponse.json({ success: false, error: "Profesor no válido." }, { status: 400 });
    }

    // Una sola transacción: si al desactivarlo tiene mentorías activas futuras, se
    // responde 409 sin guardar nada, salvo que el admin pida cancelarlas (cancelar_reservas).
    const { fila, canceladas } = await withTransaction(async (q) => {
      const result = await q(
        `UPDATE ciepi.profesores
         SET nombre = $1,
             apellido = $2,
             cedula = COALESCE($3, cedula),
             correo = $4,
             telefono = $5,
             especialidad = $6,
             biografia = $7,
             activo = COALESCE($8, activo),
             fecha_actualizacion = NOW()
         WHERE id = $9
         RETURNING id, nombre, apellido, correo, telefono, especialidad, biografia, activo, es_mentor,
                   (cedula IS NOT NULL) AS tiene_cedula, fecha_creacion, fecha_actualizacion`,
        [nombre, apellido, cedula, correo, telefono, especialidad, biografia, activo, profesorId],
      );
      if (result.rows.length === 0) return { fila: null, canceladas: [] as ReservaCanceladaPorMentor[] };
      const { es_mentor, ...datos } = result.rows[0];
      const canceladasTx = await aplicarDesactivacionMentor(q, {
        profesorId,
        esMentor: Boolean(es_mentor),
        activo: Boolean(datos.activo),
        cancelarReservas,
        motivo: MOTIVO_MENTOR_NO_DISPONIBLE,
        actor: { tipo: "admin", id: auth.adminId, descripcion: auth.email },
        rol: auth.rol,
      });
      return { fila: datos, canceladas: canceladasTx };
    });

    if (!fila) {
      return NextResponse.json(
        { success: false, error: "Profesor no encontrado" },
        { status: 404 },
      );
    }

    // Correos de las mentorías canceladas, después del commit (nunca lanza).
    const avisos = canceladas.length
      ? await enviarCancelacionesPorMentor(canceladas, MOTIVO_MENTOR_NO_DISPONIBLE)
      : [];

    return NextResponse.json({
      success: true,
      message: "Profesor actualizado exitosamente",
      data: fila,
      canceladas: canceladas.length,
      avisos,
    });
  } catch (error) {
    if (error instanceof ErrorReservasActivas) {
      return NextResponse.json(error.cuerpo(), { status: 409 });
    }
    const transicion = respuestaErrorTransicion(error);
    if (transicion) return transicion;
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
    console.error("[PUT /api/admin/profesores/[id]] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar profesor",
        message: safeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}

/**
 * Elimina un profesor solo si no está asignado a capacitaciones ni tiene reservas de
 * mentoría. Antes el ON DELETE CASCADE lo quitaba en silencio de todos los cursos; ahora
 * responde 409 y recomienda desactivarlo (activo = false), que conserva el historial.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireArea("capacitaciones");
    if (!auth.ok) return auth.respuesta;

    const profesorId = parseId(String((await params).id));
    if (!profesorId) {
      return NextResponse.json({ success: false, error: "Profesor no encontrado" }, { status: 404 });
    }

    return await withTransaction(async (q) => {
      const fila = await q(`SELECT id FROM ciepi.profesores WHERE id = $1 FOR UPDATE`, [profesorId]);
      if (fila.rows.length === 0) {
        return NextResponse.json(
          { success: false, error: "Profesor no encontrado" },
          { status: 404 },
        );
      }
      const dep = await q(
        `SELECT
           (SELECT COUNT(*) FROM ciepi.capacitacion_profesores WHERE profesor_id = $1)::int AS capacitaciones,
           (SELECT COUNT(*) FROM ciepi.mentoria_reservas WHERE profesor_id = $1)::int AS reservas,
           (SELECT COUNT(*) FROM ciepi.mentoria_reservas
             WHERE profesor_id = $1 AND estado = ANY($2::text[]))::int AS reservas_activas`,
        [profesorId, ESTADOS_RESERVA_ACTIVA],
      );
      const { capacitaciones, reservas, reservas_activas } = dep.rows[0];
      const detalle = describirDependencias([
        [capacitaciones, "capacitación", "capacitaciones"],
        [reservas, "reserva de mentoría", "reservas de mentoría"],
      ]);
      if (detalle) {
        return NextResponse.json(
          {
            success: false,
            error: `Este profesor está asignado a ${detalle}. No se puede eliminar sin perder ese historial. Desactívalo para que no se pueda asignar a nuevas capacitaciones.`,
            dependencias: { capacitaciones, reservas, reservasActivas: reservas_activas },
            sugerencia: "desactivar",
          },
          { status: 409 },
        );
      }
      await q(`DELETE FROM ciepi.profesores WHERE id = $1`, [profesorId]);
      return NextResponse.json({
        success: true,
        message: "Profesor eliminado exitosamente",
      });
    });
  } catch (error) {
    const fk = respuestaErrorFk(
      error,
      "El profesor tiene registros asociados y no se puede eliminar. Desactívalo en su lugar.",
    );
    if (fk) return fk;
    console.error("[DELETE /api/admin/profesores/[id]] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al eliminar profesor",
        message: safeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}
