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

/**
 * Extrae y valida los campos de horario, modalidad, ubicación, profesores y bloques horarios desde FormData.
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

  const rawHorarios = formData.get("horarios");
  const horarios: HorarioInput[] = [];
  if (typeof rawHorarios === "string" && rawHorarios.trim()) {
    try {
      const parsed = JSON.parse(rawHorarios);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          const dia = Number(item?.dia_semana);
          const inicio =
            typeof item?.hora_inicio === "string"
              ? item.hora_inicio.trim()
              : "";
          const fin =
            typeof item?.hora_fin === "string" ? item.hora_fin.trim() : "";
          if (
            Number.isInteger(dia) &&
            dia >= 0 &&
            dia <= 6 &&
            /^\d{2}:\d{2}(:\d{2})?$/.test(inicio) &&
            /^\d{2}:\d{2}(:\d{2})?$/.test(fin) &&
            fin > inicio
          ) {
            horarios.push({
              dia_semana: dia,
              hora_inicio: inicio.slice(0, 5),
              hora_fin: fin.slice(0, 5),
            });
          }
        }
      }
    } catch {
      // Ignorar JSON malformado en horarios opcionales
    }
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
