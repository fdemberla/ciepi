import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
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
import {
  cargarTurnosMentor,
  cargarReservaCompleta,
  expirarPendientesVencidas,
  bloquearReserva,
  transicionarReserva,
  SQL_RESERVA_OCUPA,
} from "@/lib/mentoriasServer";
import { registrarHistorial } from "@/lib/estadosServer";
import { enviarCorreoVerificacion } from "@/lib/mentoriasEmails";

class ErrorReserva extends Error {
  constructor(message: string, public status = 400, public code?: string) {
    super(message);
  }
}

/** Sin correo de verificación no hay forma de confirmar: el sistema expira la reserva. */
async function liberarTurno(reservaId: number) {
  try {
    await withTransaction(async (q) => {
      const r = await bloquearReserva(q, reservaId);
      if (!r || r.estado !== "pendiente_verificacion") return;
      await transicionarReserva(q, {
        reserva: r,
        a: "expirada",
        actor: { tipo: "sistema", descripcion: "correo de verificación no enviado" },
        motivo: "No se pudo enviar el correo de verificación.",
      });
    });
  } catch (error) {
    // Si falla, la retención vence sola en MINUTOS_PARA_CONFIRMAR minutos.
    console.error("No se pudo liberar el turno de la reserva de mentoría:", error);
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
    return NextResponse.json({ success: false, error: turnstile.error }, { status: turnstile.status ?? 403 });
  }

  const v = validarSolicitudReserva(body);
  if (!v.ok) return NextResponse.json({ success: false, error: v.error }, { status: 400 });
  const s = v.data;

  const token = generateConfirmToken();
  const ip = getClientIp(request);
  const actor = { tipo: "ciudadano" as const, descripcion: s.correo };
  try {
    const reservaId = await withTransaction(async (q) => {
      // FOR SHARE: si a la vez se desactiva al mentor, una de las dos operaciones espera a la otra.
      const mentor = await q(
        `SELECT id FROM ciepi.profesores WHERE id = $1 AND es_mentor = true AND activo = true FOR SHARE`,
        [s.profesor_id]
      );
      if (mentor.rowCount === 0) throw new ErrorReserva("Este mentor no está disponible.", 404);

      // Libera los turnos de este mentor cuyas retenciones vencieron (así el índice único no los bloquea).
      await expirarPendientesVencidas(q, { profesorId: s.profesor_id, actorDescripcion: "reserva pública" });

      if (s.area_id !== null) {
        const area = await q(
          `SELECT 1 FROM ciepi.mentor_areas ma JOIN ciepi.mentoria_areas a ON a.id = ma.area_id
           WHERE ma.profesor_id = $1 AND ma.area_id = $2 AND a.activo = true`,
          [s.profesor_id, s.area_id]
        );
        if (area.rowCount === 0) throw new ErrorReserva("El mentor no atiende esa área.");
      }

      // Serializa las solicitudes del mismo correo hasta el COMMIT: dos envíos simultáneos
      // no pueden ver ambos "menos de 2 activas" y pasar el tope.
      await q(`SELECT pg_advisory_xact_lock(hashtext('mentoria_correo:' || $1::text))`, [s.correo]);
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
      if (!turno) throw new ErrorReserva("Ese horario ya no está disponible. Elige otro.", 409, "TURNO_OCUPADO");

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
      const id = ins.rows[0].id as number;
      await registrarHistorial(q, {
        entidad: "mentoria_reserva",
        entidadId: id,
        de: null,
        a: "pendiente_verificacion",
        accion: "solicitar",
        actor,
        ip,
      });
      return id;
    });

    const reserva = await cargarReservaCompleta({ id: reservaId });
    try {
      await enviarCorreoVerificacion(reserva!, token);
    } catch (error) {
      // Sin correo no hay forma de confirmar: se libera el turno.
      console.error("No se pudo enviar el correo de verificación de mentoría:", error);
      await liberarTurno(reservaId);
      return NextResponse.json(
        { success: false, error: "No pudimos enviar el correo de confirmación. Revisa tu correo e inténtalo de nuevo." },
        { status: 502 }
      );
    }

    return NextResponse.json({ success: true, minutosParaConfirmar: MINUTOS_PARA_CONFIRMAR }, { status: 201 });
  } catch (error) {
    if (error instanceof ErrorReserva) {
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
    }
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json(
        { success: false, error: "Alguien acaba de reservar ese horario. Elige otro.", code: "TURNO_OCUPADO" },
        { status: 409 }
      );
    }
    console.error("Error al crear reserva de mentoría:", error);
    return NextResponse.json({ success: false, error: "No se pudo registrar la reserva." }, { status: 500 });
  }
}
