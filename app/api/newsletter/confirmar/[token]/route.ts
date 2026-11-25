import { NextRequest, NextResponse } from "next/server";
import { query, withTransaction } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { cambiarEstado, respuestaErrorTransicion } from "@/lib/estadosServer";
import { validarTransicion } from "@/lib/estados/comun";
import {
  TRANSICIONES_NEWSLETTER,
  evaluarConfirmacion,
  tokenExpirado,
  type EstadoSuscriptor,
  type FilaConfirmacion,
} from "@/lib/estados/newsletter";
import { hashConfirmToken, maskEmail } from "@/lib/newsletter";
import { getClientIp } from "@/lib/verificationUtils";

/*
 * Confirmación de la suscripción (doble opt-in).
 *
 * GET  → solo lectura: dice si el enlace es válido y en qué estado está la suscripción.
 *        No cambia nada, para que los escáneres de enlaces y la precarga de los clientes
 *        de correo no confirmen por la persona.
 * POST → confirma (pendiente → activo). Idempotente: si ya estaba activa responde éxito.
 */

const TOKEN_REGEX = /^[a-f0-9]{64}$/i;

type FilaSuscriptor = FilaConfirmacion & { id: number; email: string };

function tokenInvalido(clave: "valid" | "success") {
  return NextResponse.json(
    { [clave]: false, error: "Enlace de confirmación inválido." },
    { status: 400 },
  );
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    if (!token || !TOKEN_REGEX.test(token)) return tokenInvalido("valid");

    const result = await query(
      `SELECT id, email, estado, confirm_token_expiracion
       FROM ciepi.newsletter_suscriptores
       WHERE confirm_token_hash = $1`,
      [hashConfirmToken(token)],
    );
    const fila = (result.rows[0] as FilaSuscriptor | undefined) ?? null;
    const evaluacion = evaluarConfirmacion(fila, new Date());

    if (evaluacion.tipo === "error") {
      return NextResponse.json(
        {
          valid: false,
          code: evaluacion.codigo,
          error: evaluacion.mensaje,
        },
        { status: evaluacion.status },
      );
    }

    return NextResponse.json({
      valid: true,
      estado: fila!.estado,
      yaConfirmada: evaluacion.tipo === "ya_confirmada",
      emailMasked: maskEmail(fila!.email),
    });
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: safeErrorDetail(error) },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;
    if (!token || !TOKEN_REGEX.test(token)) return tokenInvalido("success");

    const tokenHash = hashConfirmToken(token);
    const ip = getClientIp(request);

    const resultado = await withTransaction(async (q) => {
      // Bloquea la fila para que dos clics simultáneos no confirmen dos veces.
      const res = await q(
        `SELECT id, email, estado, confirm_token_expiracion
         FROM ciepi.newsletter_suscriptores
         WHERE confirm_token_hash = $1
         FOR UPDATE`,
        [tokenHash],
      );
      const fila = (res.rows[0] as FilaSuscriptor | undefined) ?? null;
      const ahora = new Date();
      const evaluacion = evaluarConfirmacion(fila, ahora);
      if (evaluacion.tipo !== "confirmar") return evaluacion;

      // Segunda comprobación con la máquina de estados común (rol/guardas).
      const v = validarTransicion(TRANSICIONES_NEWSLETTER, fila!.estado, "activo" as EstadoSuscriptor, {
        actor: "ciudadano",
        tokenValido: true,
        tokenExpirado: tokenExpirado(fila!, ahora),
      });
      if (!v.ok) {
        return { tipo: "error" as const, status: v.status, codigo: "TRANSICION_INVALIDA", mensaje: v.motivo };
      }

      // UPDATE condicionado a estado = 'pendiente' + historial. El hash del token se
      // conserva para que repetir el enlace responda "ya confirmada" (idempotencia);
      // se borra al darse de baja y se reemplaza al volver a suscribirse.
      await cambiarEstado<EstadoSuscriptor>(q, {
        entidad: "newsletter_suscriptor",
        tabla: "ciepi.newsletter_suscriptores",
        columnaEstado: "estado",
        id: fila!.id,
        de: "pendiente",
        a: "activo",
        accion: v.transicion.accion,
        actor: { tipo: "ciudadano" },
        extra: { fecha_confirmacion: ahora, actualizado_en: ahora },
        ip,
      });
      return evaluacion;
    });

    if (resultado.tipo === "error") {
      return NextResponse.json(
        { success: false, code: resultado.codigo, error: resultado.mensaje },
        { status: resultado.status },
      );
    }

    if (resultado.tipo === "ya_confirmada") {
      return NextResponse.json({
        success: true,
        yaConfirmada: true,
        message: "Tu suscripción ya había sido confirmada.",
      });
    }

    return NextResponse.json({
      success: true,
      message:
        "¡Suscripción confirmada! A partir de ahora recibirás las novedades de CIEPI.",
    });
  } catch (error) {
    const errTransicion = respuestaErrorTransicion(error);
    if (errTransicion) return errTransicion;
    console.error("[Newsletter] Error al confirmar:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al confirmar la suscripción.",
        details: safeErrorDetail(error),
      },
      { status: 500 },
    );
  }
}
