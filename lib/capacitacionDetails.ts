import type { FormSection } from "@/components/Form.types";

export const MODALIDADES_VALIDAS = [
  "presencial",
  "virtual",
  "hibrida",
] as const;
export type ModalidadCapacitacion = (typeof MODALIDADES_VALIDAS)[number];

export const CAPACITACION_LOGISTICA_SECTION: FormSection = {
  name: "logistica",
  label: "Modalidad",
  type: "section",
  className: "text-indigo-700",
  fields: [
    {
      name: "modalidad",
      label: "Modalidad de la capacitación",
      type: "select",
      required: false,
      options: [
        { value: "presencial", label: "Presencial" },
        { value: "virtual", label: "Virtual" },
        { value: "hibrida", label: "Híbrida" },
      ],
    },
  ],
};

export interface HorarioInput {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

export interface CapacitacionExtraFields {
  horario: string | null;
  modalidad: ModalidadCapacitacion | null;
  sede: string | null;
  edificio: string | null;
  salon: string | null;
  sedeId: number | null;
  edificioId: number | null;
  aulaId: number | null;
  profesorIds: number[];
  horarios: HorarioInput[];
}

function cleanText(
  value: FormDataEntryValue | null,
  maxLen: number,
): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLen) : null;
}

function cleanPositiveInt(value: FormDataEntryValue | null): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const n = Number(value.trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/**
 * Error de un bloque horario (número de bloque empezando en 1), o null si es válido.
 * Se usa en el servidor y en UbicacionHorariosSelector antes de enviar.
 */
export function errorHorario(
  item: { dia_semana?: unknown; hora_inicio?: unknown; hora_fin?: unknown } | null | undefined,
  numero: number,
): string | null {
  const dia = Number(item?.dia_semana);
  const inicio = typeof item?.hora_inicio === "string" ? item.hora_inicio.trim() : "";
  const fin = typeof item?.hora_fin === "string" ? item.hora_fin.trim() : "";
  if (!Number.isInteger(dia) || dia < 0 || dia > 6) {
    return `Bloque ${numero}: el día de la semana no es válido.`;
  }
  if (!HORA_RE.test(inicio)) return `Bloque ${numero}: falta la hora de inicio o no es válida.`;
  if (!HORA_RE.test(fin)) return `Bloque ${numero}: falta la hora de fin o no es válida.`;
  if (fin.slice(0, 5) <= inicio.slice(0, 5)) {
    return `Bloque ${numero}: la hora de fin debe ser posterior a la de inicio.`;
  }
  return null;
}

/**
 * Valida todos los bloques horarios: formato, fin > inicio y que no se solapen
 * dos bloques del mismo día. Devuelve el primer error encontrado.
 */
export function validarHorarios(
  items: unknown[],
): { ok: true; horarios: HorarioInput[] } | { ok: false; error: string } {
  const horarios: HorarioInput[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i] as Record<string, unknown> | null;
    const error = errorHorario(item, i + 1);
    if (error) return { ok: false, error };
    horarios.push({
      dia_semana: Number(item!.dia_semana),
      hora_inicio: String(item!.hora_inicio).trim().slice(0, 5),
      hora_fin: String(item!.hora_fin).trim().slice(0, 5),
    });
  }
  for (let i = 0; i < horarios.length; i++) {
    for (let j = i + 1; j < horarios.length; j++) {
      const a = horarios[i];
      const b = horarios[j];
      if (a.dia_semana === b.dia_semana && a.hora_inicio < b.hora_fin && b.hora_inicio < a.hora_fin) {
        return { ok: false, error: `Bloques ${i + 1} y ${j + 1}: se solapan el mismo día.` };
      }
    }
  }
  return { ok: true, horarios };
}

const FECHA_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanFecha(value: FormDataEntryValue | null): string | null | "invalida" {
  if (typeof value !== "string" || !value.trim()) return null;
  const v = value.trim().slice(0, 10);
  if (!FECHA_RE.test(v)) return "invalida";
  const d = new Date(`${v}T00:00:00Z`);
  return Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== v ? "invalida" : v;
}

function cleanEntero(value: FormDataEntryValue | null): number | null | "invalido" {
  if (typeof value !== "string" || !value.trim()) return null;
  const v = value.trim();
  return /^-?\d+$/.test(v) ? Number(v) : "invalido";
}

export interface CapacitacionBaseFields {
  nombre: string;
  descripcion: unknown;
  cantidadHoras: number | null;
  cantidadParticipantes: number | null;
  fechaInicioInscripcion: string | null;
  fechaFinalInscripcion: string | null;
  fechaInicioCapacitacion: string | null;
  fechaFinalCapacitacion: string | null;
}

/**
 * Campos principales de crear y editar: nombre, descripción, cantidades y fechas.
 * Valida rangos numéricos y la coherencia de fechas (inicio <= fin en inscripción
 * y capacitación; la inscripción no puede cerrar después de que termine la capacitación).
 */
export function parseCapacitacionBaseFields(
  formData: FormData,
): { ok: true; data: CapacitacionBaseFields } | { ok: false; error: string } {
  const nombre = cleanText(formData.get("nombre"), 255);
  if (!nombre) return { ok: false, error: "El nombre es obligatorio" };

  let descripcion: unknown = null;
  const descripcionStr = formData.get("descripcion");
  if (typeof descripcionStr === "string" && descripcionStr) {
    try {
      descripcion = JSON.parse(descripcionStr);
    } catch {
      descripcion = descripcionStr;
    }
  }

  const cantidadHoras = cleanEntero(formData.get("cantidadHoras"));
  if (cantidadHoras === "invalido" || (cantidadHoras !== null && (cantidadHoras < 0 || cantidadHoras > 9999))) {
    return { ok: false, error: "La cantidad de horas debe ser un número entero entre 0 y 9999." };
  }
  const cantidadParticipantes = cleanEntero(formData.get("cantidad_participantes"));
  if (
    cantidadParticipantes === "invalido" ||
    (cantidadParticipantes !== null && (cantidadParticipantes < 1 || cantidadParticipantes > 99999))
  ) {
    return { ok: false, error: "La cantidad de participantes debe ser un número entero entre 1 y 99999." };
  }

  const fechas = {
    fechaInicioInscripcion: cleanFecha(formData.get("fechaInicioInscripcion")),
    fechaFinalInscripcion: cleanFecha(formData.get("fechaFinalInscripcion")),
    fechaInicioCapacitacion: cleanFecha(formData.get("fechaInicioCapacitacion")),
    fechaFinalCapacitacion: cleanFecha(formData.get("fechaFinalCapacitacion")),
  };
  for (const [campo, valor] of Object.entries(fechas)) {
    if (valor === "invalida") return { ok: false, error: `La fecha ${campo} no es válida (use AAAA-MM-DD).` };
  }
  const f = fechas as Record<keyof typeof fechas, string | null>;
  const errorFechas = errorRangoFechas(f);
  if (errorFechas) return { ok: false, error: errorFechas };

  return {
    ok: true,
    data: {
      nombre,
      descripcion,
      cantidadHoras: cantidadHoras as number | null,
      cantidadParticipantes: cantidadParticipantes as number | null,
      ...f,
    },
  };
}

/** Coherencia de fechas (AAAA-MM-DD, comparables como texto). null si son coherentes. */
export function errorRangoFechas(f: {
  fechaInicioInscripcion: string | null;
  fechaFinalInscripcion: string | null;
  fechaInicioCapacitacion: string | null;
  fechaFinalCapacitacion: string | null;
}): string | null {
  if (f.fechaInicioInscripcion && f.fechaFinalInscripcion && f.fechaFinalInscripcion < f.fechaInicioInscripcion) {
    return "El fin de la inscripción no puede ser anterior a su inicio.";
  }
  if (f.fechaInicioCapacitacion && f.fechaFinalCapacitacion && f.fechaFinalCapacitacion < f.fechaInicioCapacitacion) {
    return "El fin de la capacitación no puede ser anterior a su inicio.";
  }
  if (f.fechaFinalInscripcion && f.fechaFinalCapacitacion && f.fechaFinalInscripcion > f.fechaFinalCapacitacion) {
    return "La inscripción debe cerrar antes o el mismo día en que termina la capacitación.";
  }
  return null;
}

/**
 * Extrae y valida los campos de horario, modalidad, ubicación, profesores y bloques horarios desde FormData.
 * Los bloques horarios no válidos devuelven error (no se descartan).
 */
export function parseCapacitacionExtraFields(
  formData: FormData,
): { ok: true; data: CapacitacionExtraFields } | { ok: false; error: string } {
  const horario = cleanText(formData.get("horario"), 255);
  const rawModalidad =
    cleanText(formData.get("modalidad"), 30)?.toLowerCase() ?? null;
  const sede = cleanText(formData.get("sede"), 150);
  const edificio = cleanText(formData.get("edificio"), 150);
  const salon = cleanText(formData.get("salon"), 100);
  const sedeId = cleanPositiveInt(formData.get("sedeId"));
  const edificioId = cleanPositiveInt(formData.get("edificioId"));
  const aulaId = cleanPositiveInt(formData.get("aulaId"));

  if (
    rawModalidad !== null &&
    !MODALIDADES_VALIDAS.includes(rawModalidad as ModalidadCapacitacion)
  ) {
    return {
      ok: false,
      error: "Modalidad inválida. Debe ser presencial, virtual o hibrida.",
    };
  }

  const rawProfesores = formData.get("profesorIds");
  let profesorIds: number[] = [];

  if (typeof rawProfesores === "string" && rawProfesores.trim()) {
    try {
      const parsed = JSON.parse(rawProfesores);
      if (Array.isArray(parsed)) {
        profesorIds = parsed
          .map((v) => Number(v))
          .filter((n) => Number.isInteger(n) && n > 0);
      }
    } catch {
      profesorIds = rawProfesores
        .split(",")
        .map((v) => Number(v.trim()))
        .filter((n) => Number.isInteger(n) && n > 0);
    }
    profesorIds = Array.from(new Set(profesorIds));
  }

  // Los bloques no válidos ya no se descartan en silencio: se devuelve el error
  // para que el admin lo corrija (antes se respondía «actualizada» sin guardarlos).
  const rawHorarios = formData.get("horarios");
  let horarios: HorarioInput[] = [];
  if (typeof rawHorarios === "string" && rawHorarios.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawHorarios);
    } catch {
      return { ok: false, error: "Los horarios enviados no tienen un formato válido." };
    }
    if (!Array.isArray(parsed)) {
      return { ok: false, error: "Los horarios enviados no tienen un formato válido." };
    }
    const resultado = validarHorarios(parsed);
    if (!resultado.ok) return resultado;
    horarios = resultado.horarios;
  }

  return {
    ok: true,
    data: {
      horario,
      modalidad: rawModalidad as ModalidadCapacitacion | null,
      sede,
      edificio,
      salon,
      sedeId,
      edificioId,
      aulaId,
      profesorIds,
      horarios,
    },
  };
}

export function formatModalidadLabel(
  modalidad: string | null | undefined,
): string {
  switch (modalidad) {
    case "presencial":
      return "Presencial";
    case "virtual":
      return "Virtual";
    case "hibrida":
      return "Híbrida";
    default:
      return "";
  }
}

/**
 * Bloque que agrega el botón "Agregar día": el día siguiente al último bloque
 * (lunes → martes → … → sábado → domingo) con las mismas horas. Si no hay
 * bloques, empieza el lunes de 18:00 a 20:00.
 */
export function siguienteHorario(horarios: HorarioInput[]): HorarioInput {
  const ultimo = horarios[horarios.length - 1];
  if (!ultimo) return { dia_semana: 1, hora_inicio: "18:00", hora_fin: "20:00" };
  return {
    dia_semana: (Number(ultimo.dia_semana) + 1) % 7,
    hora_inicio: ultimo.hora_inicio,
    hora_fin: ultimo.hora_fin,
  };
}
