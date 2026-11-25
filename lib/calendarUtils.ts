export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  startTime?: string | null; // HH:MM
  endTime?: string | null; // HH:MM
  color?: "blue" | "emerald" | "purple" | "amber" | "rose";
  badge?: string;
  location?: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
}

export interface CalendarCell {
  date: Date;
  dateStr: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

export const DIAS_SEMANA_CORTOS = [
  "Dom",
  "Lun",
  "Mar",
  "Mié",
  "Jue",
  "Vie",
  "Sáb",
] as const;

export const DIAS_SEMANA_LARGOS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

export function toDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function buildMonthGrid(year: number, monthIndex0: number): CalendarCell[] {
  const todayStr = toDateStr(new Date());
  const firstDay = new Date(year, monthIndex0, 1);
  const lastDay = new Date(year, monthIndex0 + 1, 0);

  const startOffset = firstDay.getDay(); // 0 = Domingo
  const totalDays = lastDay.getDate();
  const totalCells = Math.ceil((startOffset + totalDays) / 7) * 7;

  const cells: CalendarCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(year, monthIndex0, 1 - startOffset + i);
    const dateStr = toDateStr(d);
    cells.push({
      date: d,
      dateStr,
      dayNumber: d.getDate(),
      isCurrentMonth: d.getMonth() === monthIndex0,
      isToday: dateStr === todayStr,
    });
  }
  return cells;
}

export interface HorarioBloqueInput {
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
}

export interface CapacitacionCalendarSource {
  id: number;
  nombre: string;
  modalidad: string | null;
  fecha_inicio_capacitacion: string | Date | null;
  fecha_final_capacitacion: string | Date | null;
  sede_nombre?: string | null;
  edificio_nombre?: string | null;
  aula_nombre?: string | null;
  sede?: string | null;
  edificio?: string | null;
  salon?: string | null;
  profesores?: Array<{ nombre: string; apellido: string }>;
  horarios?: HorarioBloqueInput[];
}

function parseDateOnly(value: string | Date | null): Date | null {
  if (!value) return null;
  // node-postgres entrega las columnas de fecha como objetos Date. Antes se
  // hacía String(value).slice(0, 10) ("Mon Jan 11"), el parseo fallaba y el
  // calendario no mostraba ninguna clase con datos reales.
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  }
  const part = String(value).slice(0, 10);
  const [y, m, d] = part.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function modalityColor(modalidad: string | null): CalendarEvent["color"] {
  switch (modalidad) {
    case "virtual":
      return "purple";
    case "hibrida":
      return "amber";
    default:
      return "blue";
  }
}

/**
 * Expande las capacitaciones y sus bloques horarios en ocurrencias diarias
 * dentro del mes especificado (year, monthIndex0).
 */
export function expandCapacitacionesToMonthEvents(
  capacitaciones: CapacitacionCalendarSource[],
  year: number,
  monthIndex0: number,
): CalendarEvent[] {
  const monthStart = new Date(year, monthIndex0, 1);
  const monthEnd = new Date(year, monthIndex0 + 1, 0);
  const events: CalendarEvent[] = [];

  for (const cap of capacitaciones) {
    const capStart = parseDateOnly(cap.fecha_inicio_capacitacion);
    const capEnd = parseDateOnly(cap.fecha_final_capacitacion) || capStart;
    if (!capStart || !capEnd) continue;

    const rangeStart = capStart > monthStart ? capStart : monthStart;
    const rangeEnd = capEnd < monthEnd ? capEnd : monthEnd;
    if (rangeStart > rangeEnd) continue;

    const horarios = Array.isArray(cap.horarios) ? cap.horarios : [];
    const locationParts = [
      cap.sede_nombre || cap.sede,
      cap.edificio_nombre || cap.edificio,
      cap.aula_nombre || cap.salon,
    ].filter(Boolean);
    const location = locationParts.join(" · ") || undefined;
    const subtitle =
      Array.isArray(cap.profesores) && cap.profesores.length > 0
        ? cap.profesores.map((p) => `${p.nombre} ${p.apellido}`).join(", ")
        : undefined;

    for (
      let d = new Date(rangeStart);
      d <= rangeEnd;
      d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    ) {
      const dateStr = toDateStr(d);
      const dayOfWeek = d.getDay();

      if (horarios.length > 0) {
        const matching = horarios.filter((h) => Number(h.dia_semana) === dayOfWeek);
        for (const h of matching) {
          events.push({
            id: `cap-${cap.id}-${dateStr}-${h.hora_inicio}`,
            title: cap.nombre,
            date: dateStr,
            startTime: String(h.hora_inicio).slice(0, 5),
            endTime: String(h.hora_fin).slice(0, 5),
            color: modalityColor(cap.modalidad),
            badge: cap.modalidad || undefined,
            location,
            subtitle,
            meta: { capacitacionId: cap.id, modalidad: cap.modalidad },
          });
        }
      } else if (dateStr === toDateStr(capStart)) {
        // Si no tiene horarios estructurados, mostrar al menos en la fecha de inicio
        events.push({
          id: `cap-${cap.id}-${dateStr}`,
          title: cap.nombre,
          date: dateStr,
          color: modalityColor(cap.modalidad),
          badge: cap.modalidad || undefined,
          location,
          subtitle,
          meta: { capacitacionId: cap.id, modalidad: cap.modalidad },
        });
      }
    }
  }

  return events.sort((a, b) =>
    `${a.date} ${a.startTime || ""}`.localeCompare(`${b.date} ${b.startTime || ""}`),
  );
}
