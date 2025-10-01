/**
 * Plantillas de correo electrónico para el sistema CIEPI
 */

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

/**
 * Plantilla de bienvenida para nuevos estudiantes
 */
export function getWelcomeEmailTemplate(
  nombre: string,
  apellido: string
): EmailTemplate {
  return {
    subject: "¡Bienvenido a CIEPI - INADEH!",
    text: `Hola ${nombre} ${apellido},

¡Bienvenido al Centro de Innovación y Emprendimiento (CIEPI) del INADEH!

Nos complace tenerte como parte de nuestra comunidad. A través de nuestros programas de capacitación, podrás desarrollar nuevas habilidades y alcanzar tus metas profesionales.

Para cualquier consulta o información adicional, no dudes en contactarnos.

Atentamente,
Equipo CIEPI - INADEH`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>¡Bienvenido a CIEPI!</h1>
    </div>
    <div class="content">
      <p>Hola <strong>${nombre} ${apellido}</strong>,</p>
      <p>¡Bienvenido al <strong>Centro de Innovación y Emprendimiento (CIEPI)</strong> del INADEH!</p>
      <p>Nos complace tenerte como parte de nuestra comunidad. A través de nuestros programas de capacitación, podrás desarrollar nuevas habilidades y alcanzar tus metas profesionales.</p>
      <p>Para cualquier consulta o información adicional, no dudes en contactarnos.</p>
    </div>
    <div class="footer">
      <p>Equipo CIEPI - INADEH</p>
    </div>
  </div>
</body>
</html>`,
  };
}

/**
 * Plantilla de confirmación de inscripción
 */
export function getEnrollmentConfirmationTemplate(
  nombre: string,
  apellido: string,
  nombreCapacitacion: string,
  fechaInicio?: string
): EmailTemplate {
  const fechaTexto = fechaInicio
    ? `La capacitación inicia el ${fechaInicio}.`
    : "Te informaremos la fecha de inicio próximamente.";

  return {
    subject: `Confirmación de Inscripción - ${nombreCapacitacion}`,
    text: `Hola ${nombre} ${apellido},

Tu inscripción en la capacitación "${nombreCapacitacion}" ha sido confirmada exitosamente.

${fechaTexto}

Pronto recibirás más información sobre el lugar, horarios y materiales necesarios.

Si tienes alguna pregunta, no dudes en contactarnos.

Atentamente,
Equipo CIEPI - INADEH`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; }
    .info-box { background-color: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✓ Inscripción Confirmada</h1>
    </div>
    <div class="content">
      <p>Hola <strong>${nombre} ${apellido}</strong>,</p>
      <p>Tu inscripción ha sido confirmada exitosamente.</p>
      <div class="info-box">
        <h3>Capacitación: ${nombreCapacitacion}</h3>
        <p>${fechaTexto}</p>
      </div>
      <p>Pronto recibirás más información sobre el lugar, horarios y materiales necesarios.</p>
      <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
    </div>
    <div class="footer">
      <p>Equipo CIEPI - INADEH</p>
    </div>
  </div>
</body>
</html>`,
  };
}

/**
 * Plantilla de recordatorio de capacitación
 */
export function getTrainingReminderTemplate(
  nombre: string,
  apellido: string,
  nombreCapacitacion: string,
  fechaHora: string,
  lugar: string
): EmailTemplate {
  return {
    subject: `Recordatorio - ${nombreCapacitacion}`,
    text: `Hola ${nombre} ${apellido},

Te recordamos que tu capacitación "${nombreCapacitacion}" está próxima.

Fecha y Hora: ${fechaHora}
Lugar: ${lugar}

Por favor, llega puntualmente y trae los materiales necesarios.

¡Te esperamos!

Atentamente,
Equipo CIEPI - INADEH`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #ff9800; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; }
    .info-box { background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⏰ Recordatorio de Capacitación</h1>
    </div>
    <div class="content">
      <p>Hola <strong>${nombre} ${apellido}</strong>,</p>
      <p>Te recordamos que tu capacitación está próxima:</p>
      <div class="info-box">
        <h3>${nombreCapacitacion}</h3>
        <p><strong>Fecha y Hora:</strong> ${fechaHora}</p>
        <p><strong>Lugar:</strong> ${lugar}</p>
      </div>
      <p>Por favor, llega puntualmente y trae los materiales necesarios.</p>
      <p>¡Te esperamos!</p>
    </div>
    <div class="footer">
      <p>Equipo CIEPI - INADEH</p>
    </div>
  </div>
</body>
</html>`,
  };
}

/**
 * Plantilla de notificación genérica
 */
export function getGenericNotificationTemplate(
  nombre: string,
  apellido: string,
  titulo: string,
  mensaje: string
): EmailTemplate {
  return {
    subject: titulo,
    text: `Hola ${nombre} ${apellido},

${mensaje}

Atentamente,
Equipo CIEPI - INADEH`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${titulo}</h1>
    </div>
    <div class="content">
      <p>Hola <strong>${nombre} ${apellido}</strong>,</p>
      <p>${mensaje}</p>
    </div>
    <div class="footer">
      <p>Equipo CIEPI - INADEH</p>
    </div>
  </div>
</body>
</html>`,
  };
}

/**
 * Plantilla de certificado disponible
 */
export function getCertificateReadyTemplate(
  nombre: string,
  apellido: string,
  nombreCapacitacion: string,
  urlCertificado?: string
): EmailTemplate {
  const downloadLink = urlCertificado
    ? `Puedes descargar tu certificado desde el siguiente enlace: ${urlCertificado}`
    : "Puedes descargar tu certificado desde tu perfil en el sistema.";

  return {
    subject: `Tu Certificado está Listo - ${nombreCapacitacion}`,
    text: `Hola ${nombre} ${apellido},

¡Felicitaciones! Has completado exitosamente la capacitación "${nombreCapacitacion}".

Tu certificado está listo. ${downloadLink}

Estamos orgullosos de tu logro. Te invitamos a seguir formándote con nosotros.

Atentamente,
Equipo CIEPI - INADEH`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #28a745; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; }
    .info-box { background-color: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 24px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎓 ¡Certificado Listo!</h1>
    </div>
    <div class="content">
      <p>Hola <strong>${nombre} ${apellido}</strong>,</p>
      <p>¡Felicitaciones! Has completado exitosamente la capacitación:</p>
      <div class="info-box">
        <h3>${nombreCapacitacion}</h3>
      </div>
      <p>Tu certificado está listo.</p>
      ${
        urlCertificado
          ? `<center><a href="${urlCertificado}" class="button">Descargar Certificado</a></center>`
          : "<p>Puedes descargar tu certificado desde tu perfil en el sistema.</p>"
      }
      <p>Estamos orgullosos de tu logro. Te invitamos a seguir formándote con nosotros.</p>
    </div>
    <div class="footer">
      <p>Equipo CIEPI - INADEH</p>
    </div>
  </div>
</body>
</html>`,
  };
}

/**
 * Plantilla de verificación de correo electrónico
 */
export function getEmailVerificationTemplate(
  nombre: string,
  apellido: string,
  verificationUrl: string,
  nombreCapacitacion: string,
  duracion_minutos: number = 15
): EmailTemplate {
  return {
    subject: "Verifica tu correo electrónico - CIEPI",
    text: `Hola ${nombre} ${apellido},

Para completar tu inscripción en "${nombreCapacitacion}", necesitamos verificar tu correo electrónico.

Por favor, haz clic en el siguiente enlace para verificar tu correo:
${verificationUrl}

Este enlace expirará en ${duracion_minutos} minutos.

Si no solicitaste esta inscripción, ignora este mensaje.

Atentamente,
Equipo CIEPI - INADEH`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #0066cc; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 30px; }
    .info-box { background-color: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 20px 0; }
    .button { display: inline-block; padding: 15px 30px; background-color: #28a745; color: white !important; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; font-size: 16px; }
    .warning { background-color: #fff3cd; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; font-size: 14px; }
    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✉️ Verifica tu Correo Electrónico</h1>
    </div>
    <div class="content">
      <p>Hola <strong>${nombre} ${apellido}</strong>,</p>
      <p>Para completar tu inscripción en <strong>"${nombreCapacitacion}"</strong>, necesitamos verificar tu correo electrónico.</p>
      <div class="info-box">
        <p style="margin: 0; font-size: 14px;">Haz clic en el botón de abajo para verificar tu correo y completar tu inscripción:</p>
      </div>
      <center>
        <a href="${verificationUrl}" class="button">✓ Verificar mi Correo</a>
      </center>
      <div class="warning">
        <p style="margin: 0;"><strong>⏰ Importante:</strong> Este enlace expirará en <strong>${duracion_minutos} minutos</strong>.</p>
      </div>
      <p style="font-size: 14px; color: #666;">Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:</p>
      <p style="font-size: 12px; word-break: break-all; color: #0066cc;">${verificationUrl}</p>
      <p style="font-size: 14px; color: #666; margin-top: 30px;">Si no solicitaste esta inscripción, puedes ignorar este mensaje.</p>
    </div>
    <div class="footer">
      <p>Equipo CIEPI - INADEH</p>
      <p style="color: #999; font-size: 11px;">Este es un correo automático, por favor no responder.</p>
    </div>
  </div>
</body>
</html>`,
  };
}
