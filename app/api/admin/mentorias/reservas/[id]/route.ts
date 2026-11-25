import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { requireAdmin, requireArea, parseId } from "@/lib/adminAuth";
import {
  estadoEfectivoReserva,
  validarTransicionReserva,
  mensajeTransicionNoPermitida,
  type EstadoReserva,
} from "@/lib/estados/mentoriaReserva";
import { ErrorTransicion, leerHistorial, respuestaErrorTransicion } from "@/lib/estadosServer";
import { bloquearReserva, cargarReservaCompleta, transicionarReserva } from "@/lib/mentoriasServer";
import { enviarCorreosCancelacionCiepi, enviarEnlaceReunion } from "@/lib/mentoriasEmails";
import { getClientIp } from "@/lib/verificationUtils";

type Params = { params: Promise<{ id: string }> };

const ENLACE = /^https:\/\/[^\s<>"']+$/i;

/** Historial de cambios de estado de la reserva (para el detalle en el admin). */
export async function GET(_request: NextRequest, { params }: Params) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: "Reserva no válida." }, { status: 400 });
  try {
    const historial = await leerHistorial(query, "mentoria_reserva", id);
    return NextResponse.json({ success: true, data: { historial } });
  } catch (error) {
    console.error("Error al leer el historial de la reserva de mentoría:", error);
    return NextResponse.json({ success: false, error: "No se pudo cargar el historial." }, { status: 500 });
  }
}

/**
 * Gestión de una reserva desde el admin. Acepta, por separado o juntos:
 * - estado (+ motivo si la transición lo exige): solo transiciones de la máquina de estados.
 * - enlace_reunion (+ enviar_enlace): solo reservas virtuales pendientes o confirmadas, URL https.
 * - notas_admin: notas internas, no se envían a nadie.
 *
 * Todo se valida antes de guardar y se aplica en UNA transacción: si el cambio de
 * estado falla (p. ej. 409 porque la persona canceló), no queda nada guardado a medias.
 * Los correos se envían después del commit; si fallan se devuelven como `avisos`.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireArea("mentorias");
  if (!auth.ok) return auth.respuesta;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ success: false, error: "Reserva no válida." }, { status: 400 });

  const body = await request.json().catch(() => ({}));

  // 1. Validación de forma (sin tocar la BD)
  const cambiaNotas = body.notas_admin !== undefined;
  const notas = typeof body.notas_admin === "string" ? body.notas_admin.trim().slice(0, 2000) : "";
  const cambiaEnlace = body.enlace_reunion !== undefined;
  const enlace = typeof body.enlace_reunion === "string" ? body.enlace_reunion.trim() : "";
  if (cambiaEnlace && enlace && (!ENLACE.test(enlace) || enlace.length > 500)) {
    return NextResponse.json(
      { success: false, error: "El enlace debe ser una dirección https:// válida (p. ej. de Microsoft Teams)." },
      { status: 400 }
    );
  }
  const nuevoEstado = body.estado !== undefined ? String(body.estado) : null;
  const motivo = typeof body.motivo === "string" && body.motivo.trim() ? body.motivo.trim().slice(0, 500) : null;

  const actor = {
    tipo: "admin" as const,
    id: auth.adminId,
    descripcion: auth.email,
  };
  const rol = auth.rol;

  try {
    const { estadoPrevio } = await withTransaction(async (q) => {
      const r = await bloquearReserva(q, id);
      if (!r) throw new ErrorTransicion(404, "Reserva no encontrada.", "NO_ENCONTRADO");
      const ahora = new Date(r.ahora);
      const efectivo = estadoEfectivoReserva(r.estado, r.pendiente_expira, ahora);

      // 2. Validación de reglas con la fila bloqueada, antes de escribir nada
      if (cambiaEnlace && enlace) {
        if (r.modalidad !== "virtual") {
          throw new ErrorTransicion(400, "Solo las mentorías virtuales llevan enlace.", "DATOS_INVALIDOS");
        }
        if (efectivo !== "confirmada" && efectivo !== "pendiente_verificacion") {
          throw new ErrorTransicion(
            409,
            "Solo se puede guardar el enlace en reservas pendientes o confirmadas.",
            "ESTADO_NO_EDITABLE"
          );
        }
      }
      if (nuevoEstado !== null) {
        const v = validarTransicionReserva(r, nuevoEstado, { actor: "admin", ahora, rol, motivo });
        if (!v.ok) {
          const mensaje =
            v.status === 410
              ? "Esta reserva expiró (la persona no la confirmó a tiempo); ya no se puede cambiar."
              : v.status === 400 && v.motivo.startsWith("Cambio de estado no permitido")
                ? mensajeTransicionNoPermitida(efectivo, nuevoEstado)
                : v.motivo;
          throw new ErrorTransicion(v.status === 410 ? 409 : v.status, mensaje);
        }
      }

      // 3. Escrituras (todas o ninguna)
      if (cambiaNotas || cambiaEnlace) {
        const sets: string[] = [];
        const valores: unknown[] = [];
        if (cambiaNotas) {
          valores.push(notas || null);
          sets.push(`notas_admin = $${valores.length}`);
        }
        if (cambiaEnlace) {
          valores.push(enlace || null);
          sets.push(`enlace_reunion = $${valores.length}`);
        }
        valores.push(id);
        await q(
          `UPDATE ciepi.mentoria_reservas SET ${sets.join(", ")}, fecha_actualizacion = NOW() WHERE id = $${valores.length}`,
          valores
        );
      }
      if (nuevoEstado !== null) {
        await transicionarReserva(q, {
          reserva: r,
          a: nuevoEstado,
          actor,
          rol,
          motivo,
          ip: getClientIp(request),
        });
      }
      return { estadoPrevio: r.estado as EstadoReserva };
    });

    // 4. Correos, después del commit: un fallo no deshace lo guardado.
    const avisos: string[] = [];
    if (nuevoEstado === "cancelada_ciepi" || body.enviar_enlace === true) {
      const r = await cargarReservaCompleta({ id });
      if (r && nuevoEstado === "cancelada_ciepi") {
        try {
          // Una pendiente nunca se avisó al mentor: solo se le escribe si estaba confirmada.
          await enviarCorreosCancelacionCiepi(r, motivo, { avisarMentor: estadoPrevio === "confirmada" });
        } catch (error) {
          console.error("Reserva cancelada, pero falló el correo de cancelación:", error);
          avisos.push("La reserva se canceló, pero no se pudo enviar el correo a la persona. Avísale por teléfono.");
        }
      }
      if (r && body.enviar_enlace === true) {
        if (r.estado !== "confirmada" || !r.enlace_reunion) {
          avisos.push("No se envió el enlace: la reserva debe estar confirmada y tener un enlace guardado.");
        } else {
          try {
            await enviarEnlaceReunion(r);
          } catch (error) {
            console.error("Enlace guardado, pero falló el correo:", error);
            avisos.push("El enlace se guardó, pero no se pudo enviar el correo.");
          }
        }
      }
    }

    return NextResponse.json({ success: true, avisos });
  } catch (error) {
    const respuesta = respuestaErrorTransicion(error);
    if (respuesta) return respuesta;
    console.error("Error al gestionar reserva de mentoría:", error);
    return NextResponse.json({ success: false, error: "No se pudo actualizar la reserva." }, { status: 500 });
  }
}
