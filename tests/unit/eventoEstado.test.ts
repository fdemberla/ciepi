import { describe, it, expect } from "vitest";
import {
  aInputPanama,
  estadoEvento,
  estadoEventoSql,
  fechaPanamaEvento,
  finDelDiaPanama,
  normalizarFechaEvento,
  parseEstadoEvento,
  rangoEvento,
  validarFechasEvento,
} from "@/lib/eventoEstado";

// Panamá = UTC-5 todo el año: 09:00 en Panamá = 14:00Z
const INICIO = "2026-12-10T14:00:00Z"; // 10/12 09:00 Panamá
const FIN = "2026-12-10T22:00:00Z"; // 10/12 17:00 Panamá
const t = (iso: string) => new Date(iso);

describe("estadoEvento", () => {
  it("proximo antes del inicio", () => {
    expect(estadoEvento(INICIO, FIN, t("2026-12-10T13:59:59Z"))).toBe("proximo");
  });

  it("en_curso entre inicio y fin, ambos incluidos", () => {
    expect(estadoEvento(INICIO, FIN, t(INICIO))).toBe("en_curso");
    expect(estadoEvento(INICIO, FIN, t("2026-12-10T18:00:00Z"))).toBe("en_curso");
    expect(estadoEvento(INICIO, FIN, t(FIN))).toBe("en_curso");
  });

  it("finalizado después del fin", () => {
    expect(estadoEvento(INICIO, FIN, t("2026-12-10T22:00:00.001Z"))).toBe("finalizado");
  });

  it("sin fecha_fin dura hasta el final del día de Panamá (no 1970)", () => {
    // 10/12 23:59 Panamá = 11/12 04:59Z → sigue en curso
    expect(estadoEvento(INICIO, null, t("2026-12-11T04:59:00Z"))).toBe("en_curso");
    // 11/12 00:00 Panamá = 11/12 05:00Z → finalizado
    expect(estadoEvento(INICIO, null, t("2026-12-11T05:00:00Z"))).toBe("finalizado");
    expect(estadoEvento(INICIO, null, t("2026-12-01T00:00:00Z"))).toBe("proximo");
    expect(estadoEvento(INICIO, "", t("2026-12-01T00:00:00Z"))).toBe("proximo");
  });

  it("fecha_fin anterior al inicio se trata como sin fin (no sale 'pasado' antes de empezar)", () => {
    const finMalo = "2026-12-08T13:00:00Z";
    expect(estadoEvento(INICIO, finMalo, t("2026-12-09T00:00:00Z"))).toBe("proximo");
    expect(estadoEvento(INICIO, finMalo, t("2026-12-10T20:00:00Z"))).toBe("en_curso");
  });

  it("sin inicio usa fecha_fin; sin ninguna fecha es proximo", () => {
    expect(estadoEvento(null, FIN, t("2026-12-10T22:00:00Z"))).toBe("en_curso");
    expect(estadoEvento(null, FIN, t("2026-12-11T06:00:00Z"))).toBe("finalizado");
    expect(estadoEvento(null, null, t("2026-12-11T06:00:00Z"))).toBe("proximo");
    expect(estadoEvento("no-es-fecha", undefined, t("2026-12-11T06:00:00Z"))).toBe("proximo");
  });

  it("acepta objetos Date", () => {
    expect(estadoEvento(t(INICIO), t(FIN), t("2026-12-10T15:00:00Z"))).toBe("en_curso");
  });
});

describe("finDelDiaPanama / fechaPanamaEvento", () => {
  it("un evento a las 21:00 de Panamá pertenece a ese día, no al siguiente en UTC", () => {
    const noche = t("2026-03-02T02:00:00Z"); // 1/3 21:00 Panamá
    expect(fechaPanamaEvento(noche)).toBe("2026-03-01");
    expect(finDelDiaPanama(noche).toISOString()).toBe("2026-03-02T04:59:59.999Z");
  });

  it("rangoEvento devuelve null sin fechas", () => {
    expect(rangoEvento(null, null)).toBeNull();
  });
});

describe("parseEstadoEvento", () => {
  it("acepta canónicos y alias antiguos", () => {
    expect(parseEstadoEvento("proximo")).toBe("proximo");
    expect(parseEstadoEvento("futuro")).toBe("proximo");
    expect(parseEstadoEvento("en-curso")).toBe("en_curso");
    expect(parseEstadoEvento("EN_CURSO")).toBe("en_curso");
    expect(parseEstadoEvento("pasado")).toBe("finalizado");
  });

  it("rechaza otros valores", () => {
    expect(parseEstadoEvento("x")).toBeNull();
    expect(parseEstadoEvento("")).toBeNull();
    expect(parseEstadoEvento(null)).toBeNull();
  });
});

describe("estadoEventoSql", () => {
  it("usa el alias dado y la zona de Panamá", () => {
    const sql = estadoEventoSql("e");
    expect(sql).toContain("e.fecha_inicio");
    expect(sql).toContain("e.fecha_fin");
    expect(sql).toContain("America/Panama");
    expect(sql).toContain("'finalizado'");
  });
});

describe("normalizarFechaEvento / aInputPanama", () => {
  it("datetime-local sin zona se interpreta como hora de Panamá", () => {
    expect(normalizarFechaEvento("2026-12-10T09:00")).toBe("2026-12-10T14:00:00.000Z");
  });

  it("respeta la zona si viene en el valor", () => {
    expect(normalizarFechaEvento("2026-12-10T14:00:00Z")).toBe("2026-12-10T14:00:00.000Z");
    expect(normalizarFechaEvento("2026-12-10T09:00:00-05:00")).toBe("2026-12-10T14:00:00.000Z");
  });

  it("rechaza valores no válidos", () => {
    expect(normalizarFechaEvento("mañana")).toBeNull();
    expect(normalizarFechaEvento("2026-13-45T09:00")).toBeNull();
    expect(normalizarFechaEvento("2026-12-10")).toBeNull();
  });

  it("aInputPanama es el inverso (editar y guardar no desplaza la hora)", () => {
    const iso = normalizarFechaEvento("2026-12-10T09:00")!;
    expect(aInputPanama(iso)).toBe("2026-12-10T09:00");
    expect(normalizarFechaEvento(aInputPanama(iso))).toBe(iso);
    expect(aInputPanama(null)).toBe("");
  });
});

describe("validarFechasEvento", () => {
  it("acepta fin posterior o igual al inicio", () => {
    expect(validarFechasEvento("2026-12-10T09:00", "2026-12-10T17:00")).toEqual({
      ok: true,
      fecha_inicio: "2026-12-10T14:00:00.000Z",
      fecha_fin: "2026-12-10T22:00:00.000Z",
    });
    expect(validarFechasEvento("2026-12-10T09:00", "2026-12-10T09:00").ok).toBe(true);
  });

  it("fin vacío se guarda como null", () => {
    expect(validarFechasEvento("2026-12-10T09:00", "")).toEqual({
      ok: true,
      fecha_inicio: "2026-12-10T14:00:00.000Z",
      fecha_fin: null,
    });
  });

  it("rechaza fin anterior al inicio", () => {
    const r = validarFechasEvento("2026-12-12T09:00", "2026-12-10T08:00");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/posterior/);
  });

  it("rechaza inicio ausente o fechas no válidas", () => {
    expect(validarFechasEvento(null, "2026-12-10T08:00").ok).toBe(false);
    expect(validarFechasEvento("abc", null).ok).toBe(false);
    expect(validarFechasEvento("2026-12-10T09:00", "xyz").ok).toBe(false);
  });
});
