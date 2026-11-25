import { describe, it, expect } from "vitest";
import {
  parseCapacitacionExtraFields,
  parseCapacitacionBaseFields,
  errorHorario,
  errorRangoFechas,
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

describe("parseCapacitacionExtraFields — bloques horarios", () => {
  const conHorarios = (h: unknown) => {
    const fd = new FormData();
    fd.set("horarios", typeof h === "string" ? h : JSON.stringify(h));
    return parseCapacitacionExtraFields(fd);
  };

  it("rechaza (no descarta) un bloque con fin anterior al inicio", () => {
    const r = conHorarios([
      { dia_semana: 1, hora_inicio: "18:00", hora_fin: "20:00" },
      { dia_semana: 2, hora_inicio: "20:00", hora_fin: "18:00" },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBe("Bloque 2: la hora de fin debe ser posterior a la de inicio.");
  });

  it("rechaza un bloque sin hora de fin", () => {
    const r = conHorarios([{ dia_semana: 1, hora_inicio: "18:00", hora_fin: "" }]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Bloque 1");
  });

  it("rechaza un día fuera de rango y horas imposibles", () => {
    expect(conHorarios([{ dia_semana: 7, hora_inicio: "08:00", hora_fin: "09:00" }]).ok).toBe(false);
    expect(conHorarios([{ dia_semana: 1, hora_inicio: "25:00", hora_fin: "26:00" }]).ok).toBe(false);
  });

  it("rechaza bloques que se solapan el mismo día", () => {
    const r = conHorarios([
      { dia_semana: 1, hora_inicio: "08:00", hora_fin: "10:00" },
      { dia_semana: 1, hora_inicio: "09:00", hora_fin: "11:00" },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("se solapan");
  });

  it("acepta bloques contiguos y en días distintos", () => {
    const r = conHorarios([
      { dia_semana: 1, hora_inicio: "08:00", hora_fin: "10:00" },
      { dia_semana: 1, hora_inicio: "10:00", hora_fin: "12:00" },
      { dia_semana: 3, hora_inicio: "08:00:00", hora_fin: "10:00:00" },
    ]);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.horarios[2]).toEqual({ dia_semana: 3, hora_inicio: "08:00", hora_fin: "10:00" });
  });

  it("rechaza JSON malformado en vez de ignorarlo", () => {
    expect(conHorarios("[{").ok).toBe(false);
    expect(conHorarios({ dia_semana: 1 }).ok).toBe(false);
  });

  it("errorHorario devuelve null para un bloque válido", () => {
    expect(errorHorario({ dia_semana: 0, hora_inicio: "07:30", hora_fin: "08:00" }, 1)).toBeNull();
  });
});

describe("parseCapacitacionBaseFields", () => {
  const base = (extra: Record<string, string> = {}) => {
    const fd = new FormData();
    fd.set("nombre", "Excel avanzado");
    fd.set("cantidadHoras", "20");
    fd.set("cantidad_participantes", "30");
    fd.set("fechaInicioInscripcion", "2026-01-01");
    fd.set("fechaFinalInscripcion", "2026-01-15");
    fd.set("fechaInicioCapacitacion", "2026-01-20");
    fd.set("fechaFinalCapacitacion", "2026-02-20");
    for (const [k, v] of Object.entries(extra)) fd.set(k, v);
    return parseCapacitacionBaseFields(fd);
  };

  it("acepta datos coherentes", () => {
    const r = base();
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.cantidadHoras).toBe(20);
      expect(r.data.fechaFinalInscripcion).toBe("2026-01-15");
    }
  });

  it("acepta inicio y fin el mismo día", () => {
    expect(base({ fechaFinalInscripcion: "2026-01-01" }).ok).toBe(true);
  });

  it("rechaza fin de inscripción anterior al inicio", () => {
    const r = base({ fechaFinalInscripcion: "2025-12-31" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("inscripción");
  });

  it("rechaza fin de capacitación anterior al inicio", () => {
    expect(base({ fechaFinalCapacitacion: "2026-01-19" }).ok).toBe(false);
  });

  it("rechaza que la inscripción cierre después de terminar la capacitación", () => {
    expect(base({ fechaFinalInscripcion: "2026-03-01" }).ok).toBe(false);
  });

  it("rechaza fechas con formato o valor inválido", () => {
    expect(base({ fechaInicioCapacitacion: "20/01/2026" }).ok).toBe(false);
    expect(base({ fechaInicioCapacitacion: "2026-02-30" }).ok).toBe(false);
  });

  it("rechaza cantidades negativas o no enteras (antes el PUT las aceptaba)", () => {
    expect(base({ cantidadHoras: "-1" }).ok).toBe(false);
    expect(base({ cantidadHoras: "1.5" }).ok).toBe(false);
    expect(base({ cantidad_participantes: "0" }).ok).toBe(false);
  });

  it("exige el nombre", () => {
    expect(base({ nombre: "   " }).ok).toBe(false);
  });

  it("errorRangoFechas ignora fechas vacías", () => {
    expect(
      errorRangoFechas({
        fechaInicioInscripcion: null,
        fechaFinalInscripcion: "2026-01-01",
        fechaInicioCapacitacion: null,
        fechaFinalCapacitacion: null,
      }),
    ).toBeNull();
  });
});
