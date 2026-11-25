/**
 * Lógica pura del módulo de mentorías: validación del horario semanal y
 * cálculo de turnos disponibles.
 *
 * Zona horaria: Panamá usa UTC-5 todo el año (sin horario de verano), así que
 * las horas locales se convierten a instantes con un desfase fijo. No se usa la
 * zona horaria del servidor ni la del navegador.
 */

export const PANAMA_OFFSET_HORAS = -5;
export const MODALIDADES_MENTORIA = ["presencial", "virtual"] as const;
export type ModalidadMentoria = (typeof MODALIDADES_MENTORIA)[number];
export const DURACIONES_MENTORIA = [30, 45, 60, 90] as const;
/** Anticipación mínima para reservar un turno (la usan la vista previa del admin y la reserva pública). */
export const ANTICIPACION_RESERVA_HORAS = 24;
export const DIAS_SEMANA = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

export interface DisponibilidadInput {
  id?: number;
  dia_semana: number;
  hora_inicio: string; // "HH:MM" o "HH:MM:SS", hora local de Panamá
  hora_fin: string;
  modalidad: ModalidadMentoria;
  sede_id?: number | null;
  aula_id?: number | null;
  vigente_desde?: string | Date | null; // fecha local "YYYY-MM-DD"
  vigente_hasta?: string | Date | null;
}

export interface BloqueoInput {
  fecha_inicio: string | Date;
  fecha_fin: string | Date;
}

export interface Ocupado {
  inicio: string | Date;
  fin: string | Date;
}

export interface Turno {
  inicio: string; // ISO UTC
  fin: string;
  fecha: string; // "YYYY-MM-DD" local de Panamá
  hora: string; // "HH:MM" local de Panamá
  modalidad: ModalidadMentoria;
  disponibilidad_id?: number;
  sede_id: number | null;
  aula_id: number | null;
}

// ---------------------------------------------------------------- utilidades

const pad = (n: number) => String(n).padStart(2, "0");

/** Minutos desde medianoche de "HH:MM[:SS]"; null si no es válido. */
export function parseHora(value: string): number | null {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(value).trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function formatHora(minutos: number): string {
  return `${pad(Math.floor(minutos / 60))}:${pad(minutos % 60)}`;
}

/**
 * Clave "YYYY-MM-DD" de una fecha sin hora. node-postgres entrega las columnas
 * DATE como Date a medianoche local del servidor, por eso se leen sus
 * componentes locales.
 */
export function claveFecha(value: string | Date): string {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value).slice(0, 10);
}

/** Fecha local de Panamá ("YYYY-MM-DD") de un instante. */
export function fechaPanama(instante: Date): string {
  const local = new Date(instante.getTime() + PANAMA_OFFSET_HORAS * 3600_000);
  return `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}`;
}

/** Hora local de Panamá ("HH:MM") de un instante. */
export function horaPanama(instante: Date): string {
  const local = new Date(instante.getTime() + PANAMA_OFFSET_HORAS * 3600_000);
  return `${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}`;
}

/** Instante UTC de una fecha y hora locales de Panamá. */
export function instantePanama(fecha: string, minutos: number): Date {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, minutos) - PANAMA_OFFSET_HORAS * 3600_000);
}

function sumarDias(fecha: string, dias: number): string {
  const [y, m, d] = fecha.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + dias));
  return `${t.getUTCFullYear()}-${pad(t.getUTCMonth() + 1)}-${pad(t.getUTCDate())}`;
}

function diaSemana(fecha: string): number {
  const [y, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

// ---------------------------------------------------------------- validación

export type ResultadoValidacion =
  | { ok: true; items: DisponibilidadInput[] }
  | { ok: false; error: string };

/** Valida y normaliza el horario semanal enviado desde el formulario. */
export function validarDisponibilidad(raw: unknown): ResultadoValidacion {
  if (!Array.isArray(raw)) return { ok: false, error: "El horario debe ser una lista." };
  if (raw.length > 50) return { ok: false, error: "Demasiados bloques de horario (máximo 50)." };

  const items: DisponibilidadInput[] = [];
  for (const [i, r] of raw.entries()) {
    const n = i + 1;
    const item = (r ?? {}) as Record<string, unknown>;
    const dia = Number(item.dia_semana);
    if (!Number.isInteger(dia) || dia < 0 || dia > 6) return { ok: false, error: `Bloque ${n}: día no válido.` };
    const ini = parseHora(String(item.hora_inicio ?? ""));
    const fin = parseHora(String(item.hora_fin ?? ""));
    if (ini === null || fin === null) return { ok: false, error: `Bloque ${n}: hora no válida.` };
    if (fin <= ini) return { ok: false, error: `Bloque ${n}: la hora de fin debe ser posterior a la de inicio.` };
    const modalidad = String(item.modalidad ?? "");
    if (!MODALIDADES_MENTORIA.includes(modalidad as ModalidadMentoria)) {
      return { ok: false, error: `Bloque ${n}: modalidad no válida.` };
    }
    const toId = (v: unknown) => (v === null || v === undefined || v === "" ? null : Number(v));
    const sede_id = modalidad === "presencial" ? toId(item.sede_id) : null;
    const aula_id = modalidad === "presencial" ? toId(item.aula_id) : null;
    if ((sede_id !== null && !Number.isInteger(sede_id)) || (aula_id !== null && !Number.isInteger(aula_id))) {
      return { ok: false, error: `Bloque ${n}: sede o aula no válida.` };
    }
    const fechaOk = (v: unknown) => v === null || v === undefined || v === "" || /^\d{4}-\d{2}-\d{2}$/.test(String(v));
    if (!fechaOk(item.vigente_desde) || !fechaOk(item.vigente_hasta)) {
      return { ok: false, error: `Bloque ${n}: fecha de vigencia no válida.` };
    }
    const desde = item.vigente_desde ? String(item.vigente_desde) : null;
    const hasta = item.vigente_hasta ? String(item.vigente_hasta) : null;
    if (desde && hasta && hasta < desde) {
      return { ok: false, error: `Bloque ${n}: la vigencia termina antes de empezar.` };
    }
    items.push({
      dia_semana: dia,
      hora_inicio: formatHora(ini),
      hora_fin: formatHora(fin),
      modalidad: modalidad as ModalidadMentoria,
      sede_id,
      aula_id,
      vigente_desde: desde,
      vigente_hasta: hasta,
    });
  }

  // Bloques del mismo día que se solapan producirían turnos duplicados.
  for (let a = 0; a < items.length; a++) {
    for (let b = a + 1; b < items.length; b++) {
      const x = items[a];
      const y = items[b];
      if (x.dia_semana !== y.dia_semana) continue;
      const solapan = parseHora(x.hora_inicio)! < parseHora(y.hora_fin)! && parseHora(y.hora_inicio)! < parseHora(x.hora_fin)!;
      const vigenciasCruzan =
        (!x.vigente_hasta || !y.vigente_desde || String(y.vigente_desde) <= String(x.vigente_hasta)) &&
        (!y.vigente_hasta || !x.vigente_desde || String(x.vigente_desde) <= String(y.vigente_hasta));
      if (solapan && vigenciasCruzan) {
        return {
          ok: false,
          error: `Los bloques ${a + 1} y ${b + 1} (${DIAS_SEMANA[x.dia_semana]}) se solapan.`,
        };
      }
    }
  }
  return { ok: true, items };
}

// ---------------------------------------------------------------- turnos

export interface OpcionesTurnos {
  disponibilidad: DisponibilidadInput[];
  bloqueos?: BloqueoInput[];
  ocupados?: Ocupado[];
  duracionMin: number;
  /** Momento actual (inyectable para tests). */
  ahora: Date;
  /** Cuántos días hacia adelante, contando hoy. */
  dias: number;
  /** Anticipación mínima para reservar, en horas. */
  anticipacionHoras?: number;
}

/**
 * Turnos libres de un mentor: recorre su horario semanal día por día (en
 * hora de Panamá), lo divide en turnos de `duracionMin` y descarta los que
 * caen en fechas bloqueadas, fuera de vigencia, con poca anticipación o que
 * se cruzan con una reserva activa.
 */
export function generarTurnos(o: OpcionesTurnos): Turno[] {
  const duracion = Math.round(o.duracionMin);
  if (!(duracion >= 15 && duracion <= 180)) return [];
  const limite = o.ahora.getTime() + (o.anticipacionHoras ?? 0) * 3600_000;
  const bloqueos = (o.bloqueos ?? []).map((b) => [claveFecha(b.fecha_inicio), claveFecha(b.fecha_fin)] as const);
  const ocupados = (o.ocupados ?? []).map((x) => [new Date(x.inicio).getTime(), new Date(x.fin).getTime()] as const);

  const turnos = new Map<number, Turno>();
  const hoy = fechaPanama(o.ahora);

  for (let i = 0; i < o.dias; i++) {
    const fecha = sumarDias(hoy, i);
    if (bloqueos.some(([a, b]) => fecha >= a && fecha <= b)) continue;
    const dow = diaSemana(fecha);

    for (const disp of o.disponibilidad) {
      if (Number(disp.dia_semana) !== dow) continue;
      if (disp.vigente_desde && fecha < claveFecha(disp.vigente_desde)) continue;
      if (disp.vigente_hasta && fecha > claveFecha(disp.vigente_hasta)) continue;
      const ini = parseHora(disp.hora_inicio);
      const fin = parseHora(disp.hora_fin);
      if (ini === null || fin === null) continue;

      for (let m = ini; m + duracion <= fin; m += duracion) {
        const inicio = instantePanama(fecha, m);
        const t0 = inicio.getTime();
        const t1 = t0 + duracion * 60_000;
        if (t0 < limite) continue;
        if (ocupados.some(([a, b]) => t0 < b && a < t1)) continue;
        if (turnos.has(t0)) continue; // dos bloques que generan la misma hora
        turnos.set(t0, {
          inicio: inicio.toISOString(),
          fin: new Date(t1).toISOString(),
          fecha,
          hora: formatHora(m),
          modalidad: disp.modalidad,
          disponibilidad_id: disp.id,
          sede_id: disp.modalidad === "presencial" ? (disp.sede_id ?? null) : null,
          aula_id: disp.modalidad === "presencial" ? (disp.aula_id ?? null) : null,
        });
      }
    }
  }
  return [...turnos.values()].sort((a, b) => a.inicio.localeCompare(b.inicio));
}

// ---------------------------------------------------------------- estados de reserva

export const ESTADOS_RESERVA = [
  "pendiente_verificacion",
  "expirada",
  "confirmada",
  "completada",
  "no_asistio",
  "cancelada_usuario",
  "cancelada_ciepi",
] as const;
export type EstadoReserva = (typeof ESTADOS_RESERVA)[number];

export const ETIQUETA_ESTADO_RESERVA: Record<EstadoReserva, string> = {
  pendiente_verificacion: "Pendiente de confirmar",
  expirada: "Expirada",
  confirmada: "Confirmada",
  completada: "Realizada",
  no_asistio: "No asistió",
  cancelada_usuario: "Cancelada por la persona",
  cancelada_ciepi: "Cancelada por CIEPI",
};

/**
 * Estados a los que el administrador puede mover una reserva:
 * - antes de la sesión: solo cancelarla (avisando a la persona);
 * - desde que empieza: marcarla como realizada o como inasistencia;
 * - realizada e inasistencia se pueden corregir entre sí.
 * Expiradas y canceladas son finales.
 */
export function transicionesAdminReserva(estado: string, inicio: Date, ahora: Date): EstadoReserva[] {
  const empezo = inicio.getTime() <= ahora.getTime();
  switch (estado) {
    case "pendiente_verificacion":
      return empezo ? [] : ["cancelada_ciepi"];
    case "confirmada":
      return empezo ? ["completada", "no_asistio"] : ["cancelada_ciepi"];
    case "completada":
      return ["no_asistio"];
    case "no_asistio":
      return ["completada"];
    default:
      return [];
  }
}
