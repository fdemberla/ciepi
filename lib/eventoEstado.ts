/**
 * Estado de un evento derivado de sus fechas: lógica pura (sin BD), compartida
 * por la API pública, las tarjetas, la cuenta atrás y la página /eventos.
 *
 * El estado no se guarda: se calcula a partir de fecha_inicio / fecha_fin y del
 * instante actual. Zona horaria: Panamá usa UTC-5 todo el año (sin horario de
 * verano), así que el "fin del día" se calcula con un desfase fijo, sin depender
 * de la zona del servidor ni la del navegador.
 *
 * Reglas:
 *  - Sin fecha_fin (o con fecha_fin anterior a fecha_inicio, datos heredados),
 *    el evento dura hasta el final del día de inicio en hora de Panamá.
 *  - Sin fecha_inicio pero con fecha_fin, se toma fecha_fin como inicio.
 *  - Sin ninguna fecha válida, se considera "proximo" (no se oculta).
 *  - en_curso: inicio <= ahora <= fin. finalizado: ahora > fin.
 */

export const ESTADOS_EVENTO = ["proximo", "en_curso", "finalizado"] as const;
export type EstadoEvento = (typeof ESTADOS_EVENTO)[number];

export const ZONA_PANAMA = "America/Panama";
const PANAMA_OFFSET_MS = -5 * 3600_000;
const DIA_MS = 24 * 3600_000;

type FechaEntrada = string | Date | null | undefined;

function aFecha(valor: FechaEntrada): Date | null {
  if (valor == null || valor === "") return null;
  const d = valor instanceof Date ? valor : new Date(valor);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Último milisegundo del día (hora de Panamá) que contiene el instante dado. */
export function finDelDiaPanama(instante: Date): Date {
  const local = instante.getTime() + PANAMA_OFFSET_MS;
  const inicioDiaLocal = Math.floor(local / DIA_MS) * DIA_MS;
  return new Date(inicioDiaLocal + DIA_MS - 1 - PANAMA_OFFSET_MS);
}

/** Fecha "YYYY-MM-DD" del instante en hora de Panamá. */
export function fechaPanamaEvento(valor: FechaEntrada): string {
  const d = aFecha(valor);
  if (!d) return "";
  const local = new Date(d.getTime() + PANAMA_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
}

/**
 * Valor para <input type="datetime-local"> ("YYYY-MM-DDTHH:mm") en hora de
 * Panamá. Es el inverso de normalizarFechaEvento: editar y guardar sin cambios
 * conserva el mismo instante aunque el navegador esté en otra zona.
 */
export function aInputPanama(valor: FechaEntrada): string {
  const d = aFecha(valor);
  if (!d) return "";
  const local = new Date(d.getTime() + PANAMA_OFFSET_MS);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${fechaPanamaEvento(d)}T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

/** Inicio y fin efectivos según las reglas de arriba (null si no hay fechas). */
export function rangoEvento(
  inicio: FechaEntrada,
  fin: FechaEntrada
): { inicio: Date; fin: Date } | null {
  const ini = aFecha(inicio) ?? aFecha(fin);
  if (!ini) return null;
  const f = aFecha(fin);
  return { inicio: ini, fin: f && f >= ini ? f : finDelDiaPanama(ini) };
}

export function estadoEvento(
  inicio: FechaEntrada,
  fin: FechaEntrada,
  ahora: Date = new Date()
): EstadoEvento {
  const rango = rangoEvento(inicio, fin);
  if (!rango) return "proximo";
  if (ahora > rango.fin) return "finalizado";
  if (ahora >= rango.inicio) return "en_curso";
  return "proximo";
}

/**
 * Acepta el valor de ?estado=. Además de los valores canónicos, admite los
 * nombres que se usaban antes en la UI (futuro, en-curso, pasado).
 */
export function parseEstadoEvento(valor: string | null | undefined): EstadoEvento | null {
  if (!valor) return null;
  const v = valor.trim().toLowerCase();
  const alias: Record<string, EstadoEvento> = {
    proximo: "proximo",
    futuro: "proximo",
    en_curso: "en_curso",
    "en-curso": "en_curso",
    finalizado: "finalizado",
    pasado: "finalizado",
  };
  return alias[v] ?? null;
}

/**
 * Misma regla en SQL, para filtrar antes del LIMIT. `t` es el alias de
 * ciepi.eventos. Debe mantenerse equivalente a estadoEvento().
 */
export function estadoEventoSql(t: string): string {
  const ini = `COALESCE(${t}.fecha_inicio, ${t}.fecha_fin)`;
  const fin = `CASE WHEN ${t}.fecha_fin IS NOT NULL AND ${t}.fecha_fin >= ${ini}
      THEN ${t}.fecha_fin
      ELSE ((((${ini}) AT TIME ZONE '${ZONA_PANAMA}')::date + 1)::timestamp
             AT TIME ZONE '${ZONA_PANAMA}') - INTERVAL '1 millisecond'
    END`;
  return `(CASE
    WHEN ${ini} IS NULL THEN 'proximo'
    WHEN NOW() > (${fin}) THEN 'finalizado'
    WHEN NOW() >= ${ini} THEN 'en_curso'
    ELSE 'proximo'
  END)`;
}

/**
 * Normaliza una fecha recibida del formulario de administración.
 * El <input type="datetime-local"> envía "YYYY-MM-DDTHH:mm" sin zona: se
 * interpreta como hora de Panamá (-05:00) en lugar de depender de la zona de la
 * sesión de Postgres. Devuelve un ISO en UTC, o null si el valor no es válido.
 */
export function normalizarFechaEvento(valor: string): string | null {
  const v = valor.trim();
  const sinZona = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,3})?)?$/;
  const conZona = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z|[+-]\d{2}:?\d{2})$/;
  let d: Date;
  if (sinZona.test(v)) d = new Date(`${v}-05:00`);
  else if (conZona.test(v)) d = new Date(v);
  else return null;
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export type ResultadoFechasEvento =
  | { ok: true; fecha_inicio: string; fecha_fin: string | null }
  | { ok: false; error: string };

/**
 * Valida las fechas de un evento (POST/PUT de administración): inicio
 * obligatorio, ambas con formato válido y fin >= inicio.
 */
export function validarFechasEvento(
  inicioRaw: FormDataEntryValue | null,
  finRaw: FormDataEntryValue | null
): ResultadoFechasEvento {
  const inicioStr = typeof inicioRaw === "string" ? inicioRaw.trim() : "";
  const finStr = typeof finRaw === "string" ? finRaw.trim() : "";

  if (!inicioStr) return { ok: false, error: "La fecha de inicio es obligatoria" };
  const fecha_inicio = normalizarFechaEvento(inicioStr);
  if (!fecha_inicio) return { ok: false, error: "La fecha de inicio no es válida" };

  if (!finStr) return { ok: true, fecha_inicio, fecha_fin: null };
  const fecha_fin = normalizarFechaEvento(finStr);
  if (!fecha_fin) return { ok: false, error: "La fecha de fin no es válida" };
  if (new Date(fecha_fin) < new Date(fecha_inicio)) {
    return {
      ok: false,
      error: "La fecha de fin debe ser igual o posterior a la fecha de inicio",
    };
  }
  return { ok: true, fecha_inicio, fecha_fin };
}
