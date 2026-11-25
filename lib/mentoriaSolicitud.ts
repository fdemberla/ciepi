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
  if (nombre.length < 3 || nombre.length > 200) return { ok: false, error: "Escribe tu nombre completo." };

  const correo = normalizeEmail(String(b.correo ?? ""));
  if (!isValidEmail(correo)) return { ok: false, error: "Escribe un correo electrónico válido." };

  const telefono = String(b.telefono ?? "").trim();
  if (!/^[+\d][\d\s-]{6,19}$/.test(telefono)) return { ok: false, error: "Escribe un teléfono válido (ej. 6666-6666)." };

  const tema = String(b.tema ?? "").trim();
  if (tema.length < 10) return { ok: false, error: "Cuéntanos brevemente qué quieres trabajar en la mentoría." };
  if (tema.length > 1500) return { ok: false, error: "El tema es demasiado largo (máximo 1500 caracteres)." };

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
