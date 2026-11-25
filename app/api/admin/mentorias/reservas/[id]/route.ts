import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAdmin, parseId } from "@/lib/adminAuth";
import { transicionesAdminReserva, ETIQUETA_ESTADO_RESERVA, type EstadoReserva } from "@/lib/mentorias";
import { cargarReservaCompleta } from "@/lib/mentoriasServer";
import { enviarCorreosCancelacionCiepi, enviarEnlaceReunion } from "@/lib/mentoriasEmails";

/**
 * Gestión de una reserva desde el admin. Acepta, por separado o juntos:
 * - estado (+ motivo si es cancelación): solo transiciones permitidas.
 * - enlace_reunion (+ enviar_enlace): solo reservas virtuales, URL https.
 * - notas_admin: notas internas, no se envían a nadie.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: "Reserva no válida." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const actual = await cargarReservaCompleta({ id });
  if (!actual) return NextResponse.json({ success: false, error: "Reserva no encontrada." }, { status: 404 });

  const avisos: string[] = [];
  try {
    // 1. Notas internas
    if (body.notas_admin !== undefined) {
      const notas = typeof body.notas_admin === "string" ? body.notas_admin.trim().slice(0, 2000) : "";
      await query(`UPDATE ciepi.mentoria_reservas SET notas_admin = $1, fecha_actualizacion = NOW() WHERE id = $2`, [
        notas || null,
        id,
      ]);
    }

    // 2. Enlace de la reunión
    if (body.enlace_reunion !== undefined) {
      const enlace = typeof body.enlace_reunion === "string" ? body.enlace_reunion.trim() : "";
      if (enlace && actual.modalidad !== "virtual") {
        return NextResponse.json({ success: false, error: "Solo las mentorías virtuales llevan enlace." }, { status: 400 });
      }
      if (enlace && (!/^https:\/\/[^\s<>"']+$/i.test(enlace) || enlace.length > 500)) {
        return NextResponse.json(
          { success: false, error: "El enlace debe ser una dirección https:// válida (p. ej. de Microsoft Teams)." },
          { status: 400 }
        );
      }
      await query(`UPDATE ciepi.mentoria_reservas SET enlace_reunion = $1, fecha_actualizacion = NOW() WHERE id = $2`, [
        enlace || null,
        id,
      ]);
    }

    // 3. Cambio de estado
    if (body.estado !== undefined) {
      const nuevo = String(body.estado) as EstadoReserva;
      const permitidas = transicionesAdminReserva(actual.estado, new Date(actual.inicio), new Date());
      if (!permitidas.includes(nuevo)) {
        return NextResponse.json(
          {
            success: false,
            error: `No se puede pasar de «${ETIQUETA_ESTADO_RESERVA[actual.estado as EstadoReserva] ?? actual.estado}» a «${
              ETIQUETA_ESTADO_RESERVA[nuevo] ?? nuevo
            }».`,
          },
          { status: 409 }
        );
      }
      const motivo = typeof body.motivo === "string" && body.motivo.trim() ? body.motivo.trim().slice(0, 500) : null;
      if (nuevo === "cancelada_ciepi" && !motivo) {
        return NextResponse.json(
          { success: false, error: "Escribe el motivo de la cancelación: se enviará a la persona." },
          { status: 400 }
        );
      }
      // Condicionado al estado leído: si otra persona lo cambió antes, no se pisa.
      const upd = await query(
        `UPDATE ciepi.mentoria_reservas
         SET estado = $1::varchar, fecha_actualizacion = NOW(),
             cancelada_en = CASE WHEN $1::varchar = 'cancelada_ciepi' THEN NOW() ELSE cancelada_en END,
             notas_admin = CASE WHEN $1::varchar = 'cancelada_ciepi'
                                THEN concat_ws(E'\n', notas_admin, 'Cancelada por CIEPI: ' || $3::text)
                                ELSE notas_admin END
         WHERE id = $2 AND estado = $4::varchar
         RETURNING id`,
        [nuevo, id, motivo, actual.estado]
      );
      if (upd.rowCount === 0) {
        return NextResponse.json(
          { success: false, error: "La reserva cambió mientras la editabas. Recarga e inténtalo de nuevo." },
          { status: 409 }
        );
      }
      if (nuevo === "cancelada_ciepi" && actual.estado === "confirmada") {
        try {
          await enviarCorreosCancelacionCiepi(actual, motivo);
        } catch {
          avisos.push("La reserva se canceló, pero no se pudo enviar el correo a la persona. Avísale por teléfono.");
        }
      }
    }

    // 4. Envío del enlace (después de guardarlo)
    if (body.enviar_enlace === true) {
      const r = (await cargarReservaCompleta({ id }))!;
      if (r.estado !== "confirmada" || !r.enlace_reunion) {
        avisos.push("No se envió el enlace: la reserva debe estar confirmada y tener un enlace guardado.");
      } else {
        try {
          await enviarEnlaceReunion(r);
        } catch {
          avisos.push("El enlace se guardó, pero no se pudo enviar el correo.");
        }
      }
    }

    return NextResponse.json({ success: true, avisos });
  } catch (error) {
    console.error("Error al gestionar reserva de mentoría:", error);
    return NextResponse.json({ success: false, error: "No se pudo actualizar la reserva." }, { status: 500 });
  }
}
