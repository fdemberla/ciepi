import { NextRequest, NextResponse } from "next/server";
import { safeErrorDetail } from "@/lib/apiError";
import { query } from "@/lib/db";
import { reenviarVerificacion } from "@/lib/verificationToken";
import { sendEmailVerification } from "@/lib/emailHelpers";
import { getVerificationUrl } from "@/lib/verificationUtils";
import { DURACION_ENLACE_MINUTOS, MAX_REENVIOS } from "@/lib/estados/verificacionCorreo";
import type { DatosPersona } from "@/lib/inscripcionSesion";

/**
 * POST /api/verificacion/reenviar
 * Reenvía el correo de una solicitud EXISTENTE, identificada por:
 *  - { consulta }: desde la página de espera, o
 *  - { token }: desde el enlace del correo ya vencido.
 * Siempre al mismo correo de la solicitud, con un máximo de reenvíos y una espera
 * entre ellos. Ya no acepta id_estudiante ni metadata del cliente.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const por =
      typeof body.consulta === "string"
        ? { consulta: body.consulta }
        : typeof body.token === "string"
          ? { token: body.token }
          : null;
    if (!por) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const r = await reenviarVerificacion(por);
    if (!r.ok) {
      return NextResponse.json({ error: r.mensaje }, { status: r.status });
    }

    const meta = r.fila.metadata as { capacitacion_id?: number | string; persona?: DatosPersona | null };
    let nombres = meta.persona?.nombres ?? "";
    let apellidos = meta.persona?.apellidos ?? "";
    if (r.fila.id_estudiante) {
      const est = await query(`SELECT nombres, apellidos FROM ciepi.estudiantes WHERE id = $1`, [
        r.fila.id_estudiante,
      ]);
      nombres = est.rows[0]?.nombres ?? nombres;
      apellidos = est.rows[0]?.apellidos ?? apellidos;
    }
    let nombreCapacitacion = "CIEPI";
    if (meta.capacitacion_id) {
      const cap = await query(`SELECT nombre FROM ciepi.capacitaciones WHERE id = $1`, [meta.capacitacion_id]);
      nombreCapacitacion = cap.rows[0]?.nombre ?? nombreCapacitacion;
    }

    await sendEmailVerification(
      r.fila.correo,
      nombres,
      apellidos,
      getVerificationUrl(r.token),
      nombreCapacitacion,
      DURACION_ENLACE_MINUTOS
    );

    return NextResponse.json({
      success: true,
      message: "Correo de verificación reenviado exitosamente",
      data: {
        // Solo cuando se pidió con el enlace del correo: nueva página de espera.
        consulta: r.consulta,
        fecha_expiracion: r.fecha_expiracion,
        duracion_minutos: DURACION_ENLACE_MINUTOS,
        reenvios_restantes: Math.max(0, MAX_REENVIOS - (r.fila.reenvios + 1)),
      },
    });
  } catch (error) {
    console.error("Error al reenviar correo de verificación:", error);
    return NextResponse.json(
      { error: "Error al reenviar correo de verificación", details: safeErrorDetail(error) },
      { status: 500 }
    );
  }
}
