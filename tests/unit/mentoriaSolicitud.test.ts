import { describe, it, expect } from "vitest";
import { validarSolicitudReserva, generarIcs, formatoFechaHoraPanama, primerNombre } from "@/lib/mentoriaSolicitud";

const base = {
  profesor_id: 3,
  inicio: "2026-12-07T14:00:00.000Z",
  area_id: 2,
  nombre: "  Ana   María Pérez ",
  correo: " Ana.Perez@Correo.com ",
  telefono: "6666-6666",
  tema: "Quiero validar mi modelo de negocio de café.",
  consentimiento: true,
};

describe("validarSolicitudReserva", () => {
  it("normaliza nombre y correo", () => {
    const r = validarSolicitudReserva(base);
    expect(r).toEqual({
      ok: true,
      data: {
        profesor_id: 3,
        inicio: "2026-12-07T14:00:00.000Z",
        area_id: 2,
        nombre: "Ana María Pérez",
        correo: "ana.perez@correo.com",
        telefono: "6666-6666",
        tema: "Quiero validar mi modelo de negocio de café.",
      },
    });
  });

  it.each([
    [{ consentimiento: false }, "Política de Privacidad"],
    [{ correo: "no-es-correo" }, "correo"],
    [{ telefono: "abc" }, "teléfono"],
    [{ tema: "corto" }, "qué quieres trabajar"],
    [{ inicio: "mañana" }, "horario"],
    [{ profesor_id: "x" }, "Mentor"],
  ])("rechaza datos inválidos %#", (cambio, fragmento) => {
    const r = validarSolicitudReserva({ ...base, ...cambio });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(fragmento);
  });

  it("permite reservar sin área", () => {
    const r = validarSolicitudReserva({ ...base, area_id: "" });
    expect(r.ok && r.data.area_id).toBeNull();
  });
});

describe("generarIcs", () => {
  const ics = generarIcs({
    uid: "mentoria-15@ciepi.inadeh.edu.pa",
    inicio: new Date("2026-12-07T14:00:00Z"),
    fin: new Date("2026-12-07T14:45:00Z"),
    titulo: "Mentoría CIEPI con Ana Rodríguez",
    descripcion: "Tema: finanzas; costos, precios\nModalidad: virtual",
    ubicacion: "Sede Galerías Panamericanas, Salón 101",
    ahora: new Date("2026-11-25T15:00:00Z"),
  });

  it("usa horas UTC y fin de línea CRLF", () => {
    expect(ics).toContain("DTSTART:20261207T140000Z\r\n");
    expect(ics).toContain("DTEND:20261207T144500Z\r\n");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });

  it("escapa comas, punto y coma y saltos de línea", () => {
    expect(ics.replace(/\r\n /g, "")).toContain("DESCRIPTION:Tema: finanzas\\; costos\\, precios\\nModalidad: virtual");
  });

  it("pliega líneas de más de 75 octetos", () => {
    for (const linea of ics.split("\r\n")) expect(Buffer.byteLength(linea, "utf8")).toBeLessThanOrEqual(75);
  });

  it("marca la cancelación", () => {
    const c = generarIcs({
      uid: "x", inicio: new Date(), fin: new Date(Date.now() + 1), titulo: "t", descripcion: "d", ubicacion: "u", cancelado: true,
    });
    expect(c).toContain("METHOD:CANCEL");
    expect(c).toContain("STATUS:CANCELLED");
  });
});

describe("formato", () => {
  it("muestra la hora de Panamá", () => {
    expect(formatoFechaHoraPanama("2026-12-07T14:00:00Z")).toMatch(/7 de diciembre de 2026.*9:00/);
  });
  it("primer nombre", () => {
    expect(primerNombre("  Ana María Pérez")).toBe("Ana");
  });
});
