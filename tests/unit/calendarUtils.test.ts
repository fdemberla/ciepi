import { describe, it, expect } from "vitest";
import {
  buildMonthGrid,
  expandCapacitacionesToMonthEvents,
} from "@/lib/calendarUtils";

describe("calendarUtils", () => {
  it("builds a complete 7-column month grid", () => {
    const cells = buildMonthGrid(2026, 10); // Noviembre 2026
    expect(cells.length % 7).toBe(0);
    expect(cells.some((c) => c.isCurrentMonth && c.dayNumber === 1)).toBe(true);
    expect(cells.some((c) => c.isCurrentMonth && c.dayNumber === 30)).toBe(true);
  });

  it("expands capacitacion horarios for matching days of the week in the month", () => {
    const events = expandCapacitacionesToMonthEvents(
      [
        {
          id: 10,
          nombre: "Emprendimiento Digital",
          modalidad: "presencial",
          fecha_inicio_capacitacion: "2026-11-02",
          fecha_final_capacitacion: "2026-11-09",
          sede_nombre: "Sede Central",
          edificio_nombre: "Edificio A",
          aula_nombre: "Aula 101",
          profesores: [{ nombre: "Ana", apellido: "Pérez" }],
          horarios: [
            { dia_semana: 1, hora_inicio: "18:00:00", hora_fin: "20:00:00" }, // Lunes
          ],
        },
      ],
      2026,
      10, // Noviembre 2026
    );

    // 2026-11-02 y 2026-11-09 son lunes
    expect(events).toHaveLength(2);
    expect(events[0].date).toBe("2026-11-02");
    expect(events[0].startTime).toBe("18:00");
    expect(events[0].endTime).toBe("20:00");
    expect(events[0].location).toBe("Sede Central · Edificio A · Aula 101");
    expect(events[0].subtitle).toBe("Ana Pérez");
    expect(events[1].date).toBe("2026-11-09");
  });

  it("acepta fechas como objetos Date (así las entrega node-postgres)", () => {
    const events = expandCapacitacionesToMonthEvents(
      [
        {
          id: 11,
          nombre: "Taller con fechas Date",
          modalidad: "presencial",
          fecha_inicio_capacitacion: new Date(2027, 0, 11),
          fecha_final_capacitacion: new Date(2027, 1, 19),
          horarios: [
            { dia_semana: 1, hora_inicio: "18:00:00", hora_fin: "20:00:00" },
            { dia_semana: 3, hora_inicio: "18:00:00", hora_fin: "20:00:00" },
          ],
        },
      ],
      2027,
      0, // Enero 2027
    );

    // Lunes 11, 18, 25 y miércoles 13, 20, 27
    expect(events.map((e) => e.date)).toEqual([
      "2027-01-11",
      "2027-01-13",
      "2027-01-18",
      "2027-01-20",
      "2027-01-25",
      "2027-01-27",
    ]);
  });
});
