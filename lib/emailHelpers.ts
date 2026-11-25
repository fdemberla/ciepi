/**
 * Helper functions para enviar correos usando plantillas predefinidas
 */

import { sendEmail } from "./smtp";
import { getEmailVerificationTemplate } from "./emailTemplates";

/**
 * Envía correo de verificación de correo electrónico
 */
export async function sendEmailVerification(
  email: string,
  nombre: string,
  apellido: string,
  verificationUrl: string,
  nombreCapacitacion: string,
  duracion_minutos: number = 15
) {
  const template = getEmailVerificationTemplate(
    nombre,
    apellido,
    verificationUrl,
    nombreCapacitacion,
    duracion_minutos
  );

  return sendEmail({
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}
