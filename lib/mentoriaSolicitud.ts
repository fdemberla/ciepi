/**
 * Validación de la solicitud pública de reserva y generación del archivo de
 * calendario (.ics). Funciones puras, sin acceso a la BD.
 */
import { isValidEmail, normalizeEmail } from "@/lib/newsletter";

/** Minutos que se retiene un turno mientras la persona confirma su correo. */
export const MINUTOS_PARA_CONFIRMAR = 15;
/** Reservas activas (futuras, pendientes o confirmadas) que puede tener un mismo correo. */
export const MAX_RESERVAS_ACTIVAS_POR_CORREO = 2;
/** Días hacia adelante que se ofrecen al público. */
export const DIAS_RESERVABLES = 28;
export const MENTORIA_POLICY_VERSION = "1.0";

export interface SolicitudReserva {
  profesor_id: number;
  inicio: string; // ISO
  area_id: number | null;
  nombre: string;
  correo: string;
  telefono: string;
  tema: string;
}

export type ResultadoSolicitud = { ok: true; data: SolicitudReserva } | { ok: false; error: string };

// ------------------------------------------------------- texto libre seguro
// El nombre se inserta en el saludo del correo de verificación, que se envía desde el SMTP
// institucional a un correo que escribe cualquiera: no puede llevar enlaces ni marcado.

/** Longitud máxima del nombre de la persona. */
export const MAX_NOMBRE = 100;
/** Longitud máxima del tema de la mentoría. */
export const MAX_TEMA = 1500;

/** Letras (con tildes), espacios, apóstrofo, guion y punto de abreviatura ("Ma. José"). */
const NOMBRE_PERMITIDO = /^[\p{L}\p{M}' ’.-]+$/u;

/** true si el texto contiene algo que un cliente de correo convertiría en enlace. */
export function contieneEnlace(texto: string): boolean {
  return (
    /[a-z][a-z0-9+.-]*:\/\//i.test(texto) || // http://, ftp://, ...
    /\bwww\./i.test(texto) ||
    /\b(?:mailto|javascript|data):/i.test(texto) ||
    // dominio con un TLD habitual (p. ej. "malo.com/x"); no se usa un TLD genérico para no
    // confundir texto pegado como "negocio.Además" con un enlace.
    /[a-z0-9-]\.(?:com|net|org|info|biz|io|co|me|ly|pa|xyz|top|ru|cn|site|online|link|click|app|shop|live)(?![\p{L}\p{N}])/iu.test(texto)
  );
}

/** Quita etiquetas HTML y caracteres de control (salvo saltos de línea y tabulaciones). */
export function limpiarTextoLibre(texto: string): string {
  return texto
    .replace(/<[^>]*>/g, " ")
    .replace(/[<>]/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/**
 * Nombre apto para un correo: solo caracteres de nombre y como mucho MAX_NOMBRE.
 * Se usa también al enviar, por si en la BD hay nombres anteriores a esta validación.
 */
export function nombreParaCorreo(nombre: string | null | undefined): string {
  const limpio = String(nombre ?? "")
    .replace(/[^\p{L}\p{M}' ’-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_NOMBRE)
    .trim();
  return limpio;
}

export function validarSolicitudReserva(raw: unknown): ResultadoSolicitud {
  const b = (raw ?? {}) as Record<string, unknown>;
  const profesor_id = Number(b.profesor_id);
  if (!Number.isInteger(profesor_id) || profesor_id <= 0) return { ok: false, error: "Mentor no válido." };

  const inicio = String(b.inicio ?? "");
  const fecha = new Date(inicio);
  if (!/^\d{4}-\d{2}-\d{2}T/.test(inicio) || Number.isNaN(fecha.getTime())) {
    return { ok: false, error: "Elige un horario." };
  }

  const area = b.area_id === null || b.area_id === undefined || b.area_id === "" ? null : Number(b.area_id);
  if (area !== null && (!Number.isInteger(area) || area <= 0)) return { ok: false, error: "Área no válida." };

  const nombre = String(b.nombre ?? "").trim().replace(/\s+/g, " ");
  if (nombre.length < 3 || nombre.length > MAX_NOMBRE) return { ok: false, error: "Escribe tu nombre completo." };
  // Solo letras y signos de nombre: impide usar el saludo del correo para enviar enlaces o avisos falsos.
  if (!NOMBRE_PERMITIDO.test(nombre) || /\.\S/.test(nombre) || contieneEnlace(nombre)) {
    return { ok: false, error: "Escribe tu nombre usando solo letras y espacios." };
  }

  const correo = normalizeEmail(String(b.correo ?? ""));
  if (!isValidEmail(correo)) return { ok: false, error: "Escribe un correo electrónico válido." };

  const telefono = String(b.telefono ?? "").trim();
  if (!/^[+\d][\d\s-]{6,19}$/.test(telefono)) return { ok: false, error: "Escribe un teléfono válido (ej. 6666-6666)." };

  const tema = limpiarTextoLibre(String(b.tema ?? ""));
  if (tema.length < 10) return { ok: false, error: "Cuéntanos brevemente qué quieres trabajar en la mentoría." };
  if (tema.length > MAX_TEMA) return { ok: false, error: `El tema es demasiado largo (máximo ${MAX_TEMA} caracteres).` };
  if (contieneEnlace(tema)) {
    return { ok: false, error: "No incluyas enlaces ni direcciones web en el tema; descríbelo con tus palabras." };
  }

  if (b.consentimiento !== true) {
    return { ok: false, error: "Debes aceptar la Política de Privacidad para reservar." };
  }

  return {
    ok: true,
    data: { profesor_id, inicio: fecha.toISOString(), area_id: area, nombre, correo, telefono, tema },
  };
}

// ------------------------------------------------------------------ .ics

const icsEscape = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

const icsFecha = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Pliega líneas largas a 75 octetos, como exige RFC 5545. */
function plegar(linea: string): string {
  const bytes = Buffer.from(linea, "utf8");
  if (bytes.length <= 75) return linea;
  const partes: string[] = [];
  let actual = "";
  for (const ch of linea) {
    if (Buffer.byteLength(actual + ch, "utf8") > (partes.length === 0 ? 75 : 74)) {
      partes.push(actual);
      actual = "";
    }
    actual += ch;
  }
  partes.push(actual);
  return partes.join("\r\n ");
}

export interface EventoIcs {
  uid: string;
  inicio: Date;
  fin: Date;
  titulo: string;
  descripcion: string;
  ubicacion: string;
  cancelado?: boolean;
  ahora?: Date;
}

/** Archivo iCalendar para agregar la mentoría a Outlook, Google Calendar, etc. */
export function generarIcs(e: EventoIcs): string {
  const lineas = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//INADEH//CIEPI Mentorias//ES",
    "CALSCALE:GREGORIAN",
    `METHOD:${e.cancelado ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `DTSTAMP:${icsFecha(e.ahora ?? new Date())}`,
    `DTSTART:${icsFecha(e.inicio)}`,
    `DTEND:${icsFecha(e.fin)}`,
    `SUMMARY:${icsEscape(e.titulo)}`,
    `DESCRIPTION:${icsEscape(e.descripcion)}`,
    `LOCATION:${icsEscape(e.ubicacion)}`,
    `STATUS:${e.cancelado ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lineas.map(plegar).join("\r\n") + "\r\n";
}

/** Fecha y hora legibles en Panamá, p. ej. "lunes, 7 de diciembre de 2026, 9:00 a. m.". */
export function formatoFechaHoraPanama(instante: Date | string): string {
  return new Date(instante).toLocaleString("es-PA", {
    timeZone: "America/Panama",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "Ana" a partir de "Ana María Pérez" (para no mostrar nombres completos en páginas públicas). */
export function primerNombre(nombre: string): string {
  return nombre.trim().split(/\s+/)[0] ?? "";
}
