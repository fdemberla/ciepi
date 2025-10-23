import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// Función para verificar reCAPTCHA
async function verifyRecaptcha(
  token: string
): Promise<{ success: boolean; score?: number }> {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY;

  if (!secretKey) {
    console.error(
      "[reCAPTCHA] ERROR: RECAPTCHA_SECRET_KEY no está configurada en .env"
    );
    console.error(
      "[reCAPTCHA] Verifica que .env contenga: RECAPTCHA_SECRET_KEY=tu_clave_secreta"
    );
    return { success: false };
  }

  try {
    console.log("[reCAPTCHA] Verificando token con Google...");
    const response = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `secret=${secretKey}&response=${token}`,
      }
    );

    const data = await response.json();
    console.log("[reCAPTCHA] Respuesta de Google:", {
      success: data.success,
      score: data.score,
      action: data.action,
      challenge_ts: data.challenge_ts,
    });

    return {
      success: data.success,
      score: data.score,
    };
  } catch (error) {
    console.error("[reCAPTCHA] Error verificando reCAPTCHA:", error);
    return { success: false };
  }
}

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

    // Verificar reCAPTCHA si el token está presente
    let recaptchaScore = null;
    if (recaptchaToken) {
      console.log("[Consultas] Verificando reCAPTCHA...");
      const recaptchaResult = await verifyRecaptcha(recaptchaToken);

      if (!recaptchaResult.success) {
        console.warn("[Consultas] reCAPTCHA falló - Token inválido o vencido");
        return NextResponse.json(
          {
            error:
              "Verificación de reCAPTCHA fallida. Por favor, intenta de nuevo.",
            details: "Token inválido o vencido",
          },
          { status: 400 }
        );
      }

      recaptchaScore = recaptchaResult.score || null;
      console.log(`[Consultas] reCAPTCHA válido - Score: ${recaptchaScore}`);

      // Rechazar si el score es muy bajo (posible bot)
      if (recaptchaScore !== null && recaptchaScore < 0.5) {
        console.warn(
          `[Consultas] Posible bot detectado - Score muy bajo: ${recaptchaScore}`
        );
        return NextResponse.json(
          {
            error:
              "Verificación de seguridad fallida. Por favor, intenta de nuevo más tarde.",
          },
          { status: 400 }
        );
      }
    } else {
      console.warn("[Consultas] Sin token reCAPTCHA - Saltando verificación");
    }

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
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
