/**
 * Plantillas de correo electrónico para el sistema CIEPI
 */

export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

/**
 * Escapa caracteres HTML especiales para prevenir XSS en plantillas de correo.
 */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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
  const sNombre = escapeHtml(nombre);
  const sApellido = escapeHtml(apellido);
  const sNombreCapacitacion = escapeHtml(nombreCapacitacion);
  // verificationUrl is server-generated; validate it starts with the expected scheme
  const safeUrl = /^https?:\/\//.test(verificationUrl) ? verificationUrl : "#";
  const sUrl = escapeHtml(safeUrl);
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
      <p>Hola <strong>${sNombre} ${sApellido}</strong>,</p>
      <p>Para completar tu inscripción en <strong>"${sNombreCapacitacion}"</strong>, necesitamos verificar tu correo electrónico.</p>
      <div class="info-box">
        <p style="margin: 0; font-size: 14px;">Haz clic en el botón de abajo para verificar tu correo y completar tu inscripción:</p>
      </div>
      <center>
        <a href="${sUrl}" class="button">✓ Verificar mi Correo</a>
      </center>
      <div class="warning">
        <p style="margin: 0;"><strong>⏰ Importante:</strong> Este enlace expirará en <strong>${duracion_minutos} minutos</strong>.</p>
      </div>
      <p style="font-size: 14px; color: #666;">Si no puedes hacer clic en el botón, copia y pega este enlace en tu navegador:</p>
      <p style="font-size: 12px; word-break: break-all; color: #0066cc;">${sUrl}</p>
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
