import { describe, it, expect } from "vitest";
import {
  parseCapacitacionExtraFields,
  formatModalidadLabel,
  siguienteHorario,
} from "@/lib/capacitacionDetails";

describe("capacitacionDetails helpers", () => {
  it("parses valid horario, modalidad, ubicacion and profesorIds", () => {
    const fd = new FormData();
    fd.set("horario", "  Lunes y Miércoles 6:00 PM - 8:00 PM ");
    fd.set("modalidad", "Presencial");
    fd.set("sede", "Sede Central");
    fd.set("edificio", "Edificio A");
    fd.set("salon", "Salón 204");
    fd.set("sedeId", "1");
    fd.set("edificioId", "2");
    fd.set("aulaId", "5");
    fd.set("profesorIds", JSON.stringify([1, 2, 1, "3"]));
    fd.set(
      "horarios",
      JSON.stringify([{ dia_semana: 1, hora_inicio: "18:00", hora_fin: "20:00" }]),
    );

    const parsed = parseCapacitacionExtraFields(fd);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data).toEqual({
        horario: "Lunes y Miércoles 6:00 PM - 8:00 PM",
        modalidad: "presencial",
        sede: "Sede Central",
        edificio: "Edificio A",
        salon: "Salón 204",
        sedeId: 1,
        edificioId: 2,
        aulaId: 5,
        profesorIds: [1, 2, 3],
        horarios: [{ dia_semana: 1, hora_inicio: "18:00", hora_fin: "20:00" }],
      });
    }
  });

  it("rejects invalid modalidad", () => {
    const fd = new FormData();
    fd.set("modalidad", "semipresencial-invalida");
    const parsed = parseCapacitacionExtraFields(fd);
    expect(parsed.ok).toBe(false);
  });

  it("formats modalidad labels", () => {
    expect(formatModalidadLabel("presencial")).toBe("Presencial");
    expect(formatModalidadLabel("virtual")).toBe("Virtual");
    expect(formatModalidadLabel("hibrida")).toBe("Híbrida");
    expect(formatModalidadLabel(null)).toBe("");
  });
});

describe("siguienteHorario", () => {
  it("empieza el lunes de 18:00 a 20:00", () => {
    expect(siguienteHorario([])).toEqual({ dia_semana: 1, hora_inicio: "18:00", hora_fin: "20:00" });
  });
  it("agrega el día siguiente con las mismas horas", () => {
    expect(siguienteHorario([{ dia_semana: 1, hora_inicio: "08:00", hora_fin: "12:00" }])).toEqual({
      dia_semana: 2,
      hora_inicio: "08:00",
      hora_fin: "12:00",
    });
  });
  it("después del sábado sigue el domingo", () => {
    expect(siguienteHorario([{ dia_semana: 6, hora_inicio: "09:00", hora_fin: "10:00" }]).dia_semana).toBe(0);
  });
});
