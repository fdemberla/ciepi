import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { createVerificationToken } from "@/lib/verificationToken";
import { sendEmailVerification } from "@/lib/emailHelpers";
import { getVerificationUrl, getClientIp } from "@/lib/verificationUtils";
import { borrarCookieSesion, obtenerSesion, vistaSesion } from "@/lib/inscripcionSesion";
import { DURACION_ENLACE_MINUTOS } from "@/lib/estados/verificacionCorreo";
import { ventanaInscripcionSql } from "@/lib/inscripcionVentana";

interface Params {
  params: Promise<{ capacitacion: string }>;
}

const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function enteroONull(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isInteger(n) && n > 0 ? n : null;
}

function textoCorto(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t ? t.slice(0, max) : null;
}

/**
 * GET /api/capacitaciones/inscribirse/[capacitacion]
 * Restaura el asistente (p. ej. al volver de la validación biométrica) si hay una
 * sesión de identidad verificada para esta capacitación.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { capacitacion } = await params;
  const sesion = await obtenerSesion(request);
  if (
    !sesion ||
    sesion.estado !== "identidad_verificada" ||
    String(sesion.id_capacitacion) !== capacitacion
  ) {
    return NextResponse.json({ activa: false });
  }
  return NextResponse.json({ activa: true, ...(await vistaSesion(sesion)) });
}

/**
 * POST /api/capacitaciones/inscribirse/[capacitacion]
 * Envía el correo de verificación. Todo lo relativo a identidad y biometría sale de la
 * sesión del servidor; del cliente solo se aceptan correo, teléfono, ubicación y la
 * elección de método. Los datos del estudiante NO se modifican aquí: se aplican cuando
 * se verifica el correo (/api/verificacion/validar).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { capacitacion } = await params;
    const capacitacionId = enteroONull(capacitacion);
    if (!capacitacionId) {
      return NextResponse.json({ error: "Capacitación inválida" }, { status: 400 });
    }

    const sesion = await obtenerSesion(request);
    if (!sesion || sesion.estado !== "identidad_verificada") {
      return NextResponse.json(
        {
          error: "Tu sesión de inscripción expiró. Vuelve a ingresar tu cédula y fecha de nacimiento.",
          code: "SESION_INVALIDA",
        },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const estudiante = (body.estudiante ?? {}) as Record<string, unknown>;
    const ubicacionBody = (body.ubicacion ?? {}) as Record<string, unknown>;

    const correo = textoCorto(estudiante.correo, 150)?.toLowerCase() ?? null;
    if (!correo || !CORREO_RE.test(correo)) {
      return NextResponse.json(
        { error: "Correo inválido", message: "Ingresa un correo electrónico válido.", field: "correo" },
        { status: 400 }
      );
    }
    if (body.acepto_politica !== true) {
      return NextResponse.json(
        { error: "Debes aceptar la Política de Privacidad para completar tu inscripción." },
        { status: 400 }
      );
    }

    const capRes = await query(
      `SELECT id, nombre, activo, ${ventanaInscripcionSql("c")}
         FROM ciepi.capacitaciones c WHERE id = $1`,
      [capacitacionId]
    );
    const cap = capRes.rows[0];
    if (!cap) {
      return NextResponse.json({ error: "Capacitación no encontrada" }, { status: 404 });
    }
    if (!cap.activo) {
      return NextResponse.json({ error: "Esta capacitación no está disponible para inscripciones" }, { status: 400 });
    }
    if (!cap.inscripcion_iniciada) {
      return NextResponse.json({ error: "El período de inscripción aún no ha iniciado" }, { status: 400 });
    }
    if (!cap.inscripcion_vigente) {
      return NextResponse.json({ error: "El período de inscripción ha finalizado" }, { status: 400 });
    }

    if (sesion.id_estudiante) {
      const ya = await query(
        `SELECT 1 FROM ciepi.inscripciones WHERE id_usuario = $1 AND id_capacitacion = $2`,
        [sesion.id_estudiante, capacitacionId]
      );
      if (ya.rows.length > 0) {
        return NextResponse.json({ error: "Ya está inscrito en esta capacitación" }, { status: 400 });
      }
    }

    const correoOcupado = await query(
      `SELECT 1 FROM ciepi.estudiantes WHERE LOWER(correo) = $1 AND id IS DISTINCT FROM $2`,
      [correo, sesion.id_estudiante]
    );
    if (correoOcupado.rows.length > 0) {
      return NextResponse.json(
        {
          error: "Correo duplicado",
          message: `El correo ${correo} ya está registrado en el sistema.`,
          field: "correo",
        },
        { status: 409 }
      );
    }

    const biometria = sesion.biometria?.valido && body.metodo_validacion !== "manual" ? sesion.biometria : null;
    const metodo: "biometrica" | "manual" = biometria ? "biometrica" : "manual";

    // Consumir la sesión (evita dobles envíos y reutilizarla para enviar correos).
    const tomada = await query(
      `UPDATE ciepi.inscripcion_sesiones SET estado = 'usada'
        WHERE id = $1 AND estado = 'identidad_verificada' RETURNING id`,
      [sesion.id]
    );
    if (tomada.rows.length === 0) {
      return NextResponse.json(
        { error: "Esta inscripción ya se envió. Revisa tu correo.", code: "SESION_USADA" },
        { status: 409 }
      );
    }

    const persona = sesion.datos_persona;
    const { token, consulta, fecha_expiracion } = await createVerificationToken({
      id_estudiante: sesion.id_estudiante,
      cedula: sesion.cedula,
      correo,
      tipo: "inscripcion",
      ip: getClientIp(request),
      metadata: {
        capacitacion_id: capacitacionId,
        metodo_validacion: metodo,
        biometria,
        contacto: { correo, telefono: textoCorto(estudiante.telefono, 30) },
        ubicacion: {
          provincia_id: enteroONull(ubicacionBody.provincia_id),
          distrito_id: enteroONull(ubicacionBody.distrito_id),
          corregimiento_id: enteroONull(ubicacionBody.corregimiento_id),
          calle: textoCorto(ubicacionBody.calle, 255),
        },
        // Para estudiantes nuevos: datos oficiales tomados de la sesión, no del formulario.
        persona: sesion.id_estudiante ? null : persona,
      },
    });

    let correoEnviado = true;
    try {
      await sendEmailVerification(
        correo,
        persona.nombres,
        persona.apellidos,
        getVerificationUrl(token),
        cap.nombre,
        DURACION_ENLACE_MINUTOS
      );
    } catch (err) {
      correoEnviado = false;
      console.error("Error enviando correo de verificación:", err);
    }

    const res = NextResponse.json({
      success: true,
      message: correoEnviado
        ? "Correo de verificación enviado. Por favor revisa tu email."
        : "No pudimos enviar el correo. Usa «Reenviar» en la siguiente pantalla.",
      verification_required: true,
      correo_enviado: correoEnviado,
      metodo_validacion: metodo,
      consulta,
      data: { correo, fecha_expiracion },
    });
    borrarCookieSesion(res);
    return res;
  } catch (error) {
    console.error("Error in inscripción API:", error);
    return NextResponse.json(
      { error: "Error al procesar la inscripción", details: safeErrorDetail(error) },
      { status: 500 }
    );
  }
}
