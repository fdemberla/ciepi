import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

// Configuración del transporter SMTP
let transporter: Transporter | null = null;

/**
 * Crea y retorna una instancia del transporter SMTP
 * Reutiliza la conexión existente si ya está creada
 */
export function getSmtpTransporter(): Transporter {
  if (transporter) {
    return transporter;
  }

  const smtpServer = process.env.SMTP_SERVER;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (!smtpServer || !smtpPort || !smtpUser || !smtpPass) {
    throw new Error("Faltan configuraciones SMTP en las variables de entorno");
  }

  transporter = nodemailer.createTransport({
    host: smtpServer,
    port: parseInt(smtpPort),
    secure: false, // true for 465, false for other ports
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false,
    },
  });

  return transporter;
}

/**
 * Interfaz para las opciones de envío de correo
 */
export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
    contentType?: string;
  }>;
}

/**
 * Envía un correo electrónico usando la configuración SMTP
 * @param options Opciones del correo a enviar
 * @returns Promise con la información del correo enviado
 */
export async function sendEmail(options: SendEmailOptions) {
  try {
    const transporter = getSmtpTransporter();

    const defaultFrom = process.env.SMTP_USER || "noreply@inadeh.edu.pa";

    const mailOptions = {
      from: options.from || defaultFrom,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
      cc: options.cc
        ? Array.isArray(options.cc)
          ? options.cc.join(", ")
          : options.cc
        : undefined,
      bcc: options.bcc
        ? Array.isArray(options.bcc)
          ? options.bcc.join(", ")
          : options.bcc
        : undefined,
      attachments: options.attachments,
    };

    const info = await transporter.sendMail(mailOptions);

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
    };
  } catch (error) {
    console.error("Error al enviar correo:", error);
    throw error;
  }
}

/**
 * Verifica la conexión SMTP
 * @returns Promise que resuelve true si la conexión es exitosa
 */
export async function verifySmtpConnection(): Promise<boolean> {
  try {
    const transporter = getSmtpTransporter();
    await transporter.verify();
    return true;
  } catch (error) {
    console.error("Error al verificar conexión SMTP:", error);
    return false;
  }
}

/**
 * Cierra la conexión SMTP
 */
export function closeSmtpConnection(): void {
  if (transporter) {
    transporter.close();
    transporter = null;
  }
}
