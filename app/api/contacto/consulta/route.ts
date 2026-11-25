import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { safeErrorDetail } from "@/lib/apiError";
import { registrarHistorial } from "@/lib/estadosServer";
import { getClientIp } from "@/lib/verificationUtils";
import { verifyRecaptchaToken } from "@/lib/recaptcha";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log("[Consultas] Datos recibidos:", {
      nombre: body.nombre,
      email: body.email,
      tieneToken: !!body.recaptchaToken,
      tokenLength: body.recaptchaToken?.length,
    });

    const {
      nombre,
      email,
      telefono,
      tipoConsulta,
      sede,
      areadeformacion,
      CursoInteres,
      comentarios,
      recaptchaToken,
    } = body;

    // Validar campos obligatorios
    if (!nombre || !email || !telefono || !comentarios) {
      console.warn("[Consultas] Campos obligatorios faltantes");
      return NextResponse.json(
        {
          error:
            "Datos incompletos. Nombre, email, teléfono y comentarios son obligatorios.",
        },
        { status: 400 }
      );
    }

    // Verificar reCAPTCHA: obligatorio si RECAPTCHA_SECRET_KEY está configurada; en
    // producción, si falta la clave, se rechaza el envío (fallo cerrado).
    const captcha = await verifyRecaptchaToken(recaptchaToken, {
      accion: "submit",
      remoteIp: getClientIp(request),
    });
    if (!captcha.success) {
      console.warn("[Consultas] Verificación reCAPTCHA rechazada", { status: captcha.status, score: captcha.score });
      return NextResponse.json(
        { error: captcha.error ?? "Verificación de seguridad fallida. Por favor, intenta de nuevo." },
        { status: captcha.status ?? 400 }
      );
    }
    const recaptchaScore = captcha.score ?? null;

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.warn(`[Consultas] Email inválido: ${email}`);
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    console.log("[Consultas] Insertando consulta en BD...");
    // Insertar consulta en la base de datos
    const insertQuery = `
      INSERT INTO ciepi.consultas (
        nombre,
        email,
        telefono,
        tipo_consulta_id,
        sede_id,
        area_formacion_id,
        curso_interes,
        comentarios,
        estado,
        recaptcha_token,
        recaptcha_score
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendiente', $9, $10)
      RETURNING id, fecha_creacion
    `;

    const result = await query(insertQuery, [
      nombre,
      email,
      telefono,
      tipoConsulta || null,
      sede || null,
      areadeformacion || null,
      CursoInteres || null,
      comentarios,
      recaptchaToken || null,
      recaptchaScore,
    ]);

    const consultaId = result.rows[0].id;

    // Historial de estados: creación (de = null → pendiente). Si falla no se pierde
    // la consulta del ciudadano; solo queda sin la entrada inicial del historial.
    try {
      await registrarHistorial(query, {
        entidad: "consulta",
        entidadId: consultaId,
        de: null,
        a: "pendiente",
        accion: "crear",
        actor: { tipo: "ciudadano", descripcion: String(email).slice(0, 200) },
        ip: getClientIp(request),
      });
    } catch (error) {
      console.error("[Consultas] No se pudo registrar el historial de creación:", error);
    }

    console.log(`[Consultas] Consulta creada exitosamente - ID: ${consultaId}`);
    console.log(
      `[Consultas] Email: ${email}, reCAPTCHA Score: ${recaptchaScore}`
    );

    // TODO: Enviar email de confirmación al usuario
    // TODO: Notificar a administradores sobre nueva consulta

    return NextResponse.json(
      {
        success: true,
        message:
          "Consulta enviada exitosamente. Nos pondremos en contacto contigo pronto.",
        data: {
          id: consultaId,
          fecha_creacion: result.rows[0].fecha_creacion,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Consultas] Error creando consulta:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al procesar la consulta",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
