/**
 * Helper functions para enviar correos usando plantillas predefinidas
 */

import { sendEmail } from "./smtp";
import {
  getWelcomeEmailTemplate,
  getEnrollmentConfirmationTemplate,
  getTrainingReminderTemplate,
  getGenericNotificationTemplate,
  getCertificateReadyTemplate,
  getEmailVerificationTemplate,
} from "./emailTemplates";

/**
 * Envía correo de bienvenida a un nuevo estudiante
 */
export async function sendWelcomeEmail(
  email: string,
  nombre: string,
  apellido: string
) {
  const template = getWelcomeEmailTemplate(nombre, apellido);

  return sendEmail({
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

/**
 * Envía correo de confirmación de inscripción
 */
export async function sendEnrollmentConfirmationEmail(
  email: string,
  nombre: string,
  apellido: string,
  nombreCapacitacion: string,
  fechaInicio?: string
) {
  const template = getEnrollmentConfirmationTemplate(
    nombre,
    apellido,
    nombreCapacitacion,
    fechaInicio
  );

  return sendEmail({
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

/**
 * Envía recordatorio de capacitación
 */
export async function sendTrainingReminderEmail(
  email: string,
  nombre: string,
  apellido: string,
  nombreCapacitacion: string,
  fechaHora: string,
  lugar: string
) {
  const template = getTrainingReminderTemplate(
    nombre,
    apellido,
    nombreCapacitacion,
    fechaHora,
    lugar
  );

  return sendEmail({
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

/**
 * Envía notificación genérica
 */
export async function sendGenericNotification(
  email: string,
  nombre: string,
  apellido: string,
  titulo: string,
  mensaje: string
) {
  const template = getGenericNotificationTemplate(
    nombre,
    apellido,
    titulo,
    mensaje
  );

  return sendEmail({
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

/**
 * Envía notificación de certificado disponible
 */
export async function sendCertificateReadyEmail(
  email: string,
  nombre: string,
  apellido: string,
  nombreCapacitacion: string,
  urlCertificado?: string
) {
  const template = getCertificateReadyTemplate(
    nombre,
    apellido,
    nombreCapacitacion,
    urlCertificado
  );

  return sendEmail({
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

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

/**
 * Envía correo a múltiples destinatarios
 */
export async function sendBulkEmail(
  emails: string[],
  subject: string,
  text: string,
  html: string
) {
  return sendEmail({
    to: emails,
    subject,
    text,
    html,
  });
}
