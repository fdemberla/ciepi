import { NextRequest, NextResponse } from "next/server";
import { withTransaction, query } from "@/lib/db";
import { verifyTurnstileToken } from "@/lib/turnstile";
import { getClientIp } from "@/lib/verificationUtils";
import { generateConfirmToken, hashConfirmToken } from "@/lib/newsletter";
import {
  validarSolicitudReserva,
  MINUTOS_PARA_CONFIRMAR,
  MAX_RESERVAS_ACTIVAS_POR_CORREO,
  DIAS_RESERVABLES,
  MENTORIA_POLICY_VERSION,
} from "@/lib/mentoriaSolicitud";
import { cargarTurnosMentor, cargarReservaCompleta, SQL_RESERVA_OCUPA } from "@/lib/mentoriasServer";
import { enviarCorreoVerificacion } from "@/lib/mentoriasEmails";

class ErrorReserva extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

/**
 * Solicitud pública de reserva. Retiene el turno MINUTOS_PARA_CONFIRMAR minutos
 * y envía un correo con el enlace para confirmarla.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  const turnstile = await verifyTurnstileToken(body?.turnstileToken, getClientIp(request));
  if (!turnstile.success) {
    return NextResponse.json({ success: false, error: turnstile.error }, { status: 403 });
  }

  const v = validarSolicitudReserva(body);
  if (!v.ok) return NextResponse.json({ success: false, error: v.error }, { status: 400 });
  const s = v.data;

  const token = generateConfirmToken();
  try {
    const reservaId = await withTransaction(async (q) => {
      // Libera los turnos cuyas retenciones vencieron (así el índice único no los bloquea).
      await q(
        `UPDATE ciepi.mentoria_reservas SET estado = 'expirada', fecha_actualizacion = NOW()
         WHERE estado = 'pendiente_verificacion' AND pendiente_expira <= NOW()`
      );

      const mentor = await q(
        `SELECT id FROM ciepi.profesores WHERE id = $1 AND es_mentor = true AND activo = true`,
        [s.profesor_id]
      );
      if (mentor.rowCount === 0) throw new ErrorReserva("Este mentor no está disponible.", 404);

      if (s.area_id !== null) {
        const area = await q(
          `SELECT 1 FROM ciepi.mentor_areas ma JOIN ciepi.mentoria_areas a ON a.id = ma.area_id
           WHERE ma.profesor_id = $1 AND ma.area_id = $2 AND a.activo = true`,
          [s.profesor_id, s.area_id]
        );
        if (area.rowCount === 0) throw new ErrorReserva("El mentor no atiende esa área.");
      }

      const activas = await q(
        `SELECT COUNT(*)::int AS n FROM ciepi.mentoria_reservas r
         WHERE lower(r.correo) = $1 AND r.fin > NOW() AND ${SQL_RESERVA_OCUPA}`,
        [s.correo]
      );
      if (activas.rows[0].n >= MAX_RESERVAS_ACTIVAS_POR_CORREO) {
        throw new ErrorReserva(
          `Ya tienes ${MAX_RESERVAS_ACTIVAS_POR_CORREO} mentorías activas. Cancela una o espera a que se realicen para reservar otra.`,
          409
        );
      }

      // El horario pedido tiene que ser uno de los turnos libres calculados por el servidor.
      const t = await cargarTurnosMentor(s.profesor_id, DIAS_RESERVABLES, q);
      const turno = t?.turnos.find((x) => x.inicio === s.inicio);
      if (!turno) throw new ErrorReserva("Ese horario ya no está disponible. Elige otro.", 409);

      const ins = await q(
        `INSERT INTO ciepi.mentoria_reservas
           (profesor_id, area_id, inicio, fin, modalidad, sede_id, aula_id, nombre, correo, telefono, tema,
            estado, pendiente_expira, token_gestion_hash,
            consentimiento_privacidad, consentimiento_version, consentimiento_fecha)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
                 'pendiente_verificacion', NOW() + make_interval(mins => $12), $13,
                 true, $14, NOW())
         RETURNING id`,
        [
          s.profesor_id, s.area_id, turno.inicio, turno.fin, turno.modalidad, turno.sede_id, turno.aula_id,
          s.nombre, s.correo, s.telefono, s.tema, MINUTOS_PARA_CONFIRMAR, hashConfirmToken(token),
          MENTORIA_POLICY_VERSION,
        ]
      );
      return ins.rows[0].id as number;
    });

    const reserva = await cargarReservaCompleta({ id: reservaId });
    try {
      await enviarCorreoVerificacion(reserva!, token);
    } catch (error) {
      // Sin correo no hay forma de confirmar: se libera el turno.
      console.error("No se pudo enviar el correo de verificación de mentoría:", error);
      await query(`UPDATE ciepi.mentoria_reservas SET estado = 'expirada', fecha_actualizacion = NOW() WHERE id = $1`, [reservaId]);
      return NextResponse.json(
        { success: false, error: "No pudimos enviar el correo de confirmación. Revisa tu correo e inténtalo de nuevo." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, minutosParaConfirmar: MINUTOS_PARA_CONFIRMAR }, { status: 201 });
  } catch (error) {
    if (error instanceof ErrorReserva) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json(
        { success: false, error: "Alguien acaba de reservar ese horario. Elige otro." },
        { status: 409 }
      );
    }
    console.error("Error al crear reserva de mentoría:", error);
    return NextResponse.json({ success: false, error: "No se pudo registrar la reserva." }, { status: 500 });
  }
}
