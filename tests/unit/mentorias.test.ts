import { describe, it, expect } from "vitest";
import {
  generarTurnos,
  validarDisponibilidad,
  instantePanama,
  fechaPanama,
  type DisponibilidadInput,
} from "@/lib/mentorias";

// Lunes 7 de diciembre de 2026, 08:00 en Panamá (= 13:00 UTC)
const AHORA = new Date("2026-12-07T13:00:00Z");

const lunes9a11: DisponibilidadInput = {
  id: 1,
  dia_semana: 1,
  hora_inicio: "09:00",
  hora_fin: "11:00",
  modalidad: "virtual",
};

describe("zona horaria de Panamá (UTC-5 fijo)", () => {
  it("convierte hora local a UTC sin depender del servidor", () => {
    expect(instantePanama("2026-12-07", 9 * 60).toISOString()).toBe("2026-12-07T14:00:00.000Z");
  });

  it("la fecha local cambia a las 19:00 UTC del día anterior", () => {
    expect(fechaPanama(new Date("2026-12-08T04:59:00Z"))).toBe("2026-12-07");
    expect(fechaPanama(new Date("2026-12-08T05:00:00Z"))).toBe("2026-12-08");
  });
});

describe("generarTurnos", () => {
  it("divide el bloque semanal en turnos de la duración del mentor", () => {
    const turnos = generarTurnos({ disponibilidad: [lunes9a11], duracionMin: 45, ahora: AHORA, dias: 7 });
    // 09:00, 09:45 (10:30 no cabe: terminaría 11:15)
    expect(turnos.map((t) => `${t.fecha} ${t.hora}`)).toEqual(["2026-12-07 09:00", "2026-12-07 09:45"]);
    expect(turnos[0].inicio).toBe("2026-12-07T14:00:00.000Z");
    expect(turnos[0].fin).toBe("2026-12-07T14:45:00.000Z");
  });

  it("repite el horario cada semana dentro del rango", () => {
    const turnos = generarTurnos({ disponibilidad: [lunes9a11], duracionMin: 60, ahora: AHORA, dias: 15 });
    expect(new Set(turnos.map((t) => t.fecha))).toEqual(new Set(["2026-12-07", "2026-12-14", "2026-12-21"]));
  });

  it("respeta la anticipación mínima", () => {
    const turnos = generarTurnos({
      disponibilidad: [lunes9a11],
      duracionMin: 60,
      ahora: AHORA,
      dias: 8,
      anticipacionHoras: 24,
    });
    expect(turnos.map((t) => t.fecha)).toEqual(["2026-12-14", "2026-12-14"]);
  });

  it("excluye fechas bloqueadas (incluye ambos extremos)", () => {
    const turnos = generarTurnos({
      disponibilidad: [lunes9a11],
      bloqueos: [{ fecha_inicio: "2026-12-14", fecha_fin: "2026-12-14" }],
      duracionMin: 60,
      ahora: AHORA,
      dias: 15,
    });
    expect(turnos.some((t) => t.fecha === "2026-12-14")).toBe(false);
    expect(turnos.some((t) => t.fecha === "2026-12-21")).toBe(true);
  });

  it("acepta bloqueos como Date (como los entrega node-postgres)", () => {
    const turnos = generarTurnos({
      disponibilidad: [lunes9a11],
      bloqueos: [{ fecha_inicio: new Date(2026, 11, 7), fecha_fin: new Date(2026, 11, 7) }],
      duracionMin: 60,
      ahora: AHORA,
      dias: 1,
    });
    expect(turnos).toHaveLength(0);
  });

  it("quita los turnos que se cruzan con una reserva activa", () => {
    const turnos = generarTurnos({
      disponibilidad: [lunes9a11],
      ocupados: [{ inicio: "2026-12-07T14:30:00Z", fin: "2026-12-07T15:00:00Z" }],
      duracionMin: 60,
      ahora: AHORA,
      dias: 1,
    });
    expect(turnos.map((t) => t.hora)).toEqual(["10:00"]);
  });

  it("respeta la vigencia del bloque", () => {
    const turnos = generarTurnos({
      disponibilidad: [{ ...lunes9a11, vigente_desde: "2026-12-10", vigente_hasta: "2026-12-20" }],
      duracionMin: 60,
      ahora: AHORA,
      dias: 21,
    });
    expect(new Set(turnos.map((t) => t.fecha))).toEqual(new Set(["2026-12-14"]));
  });

  it("solo asigna sede y aula a los turnos presenciales", () => {
    const turnos = generarTurnos({
      disponibilidad: [
        { ...lunes9a11, modalidad: "virtual", sede_id: 3, aula_id: 4 },
        { id: 2, dia_semana: 1, hora_inicio: "14:00", hora_fin: "15:00", modalidad: "presencial", sede_id: 3, aula_id: 4 },
      ],
      duracionMin: 60,
      ahora: AHORA,
      dias: 1,
    });
    expect(turnos.find((t) => t.modalidad === "virtual")?.sede_id).toBeNull();
    expect(turnos.find((t) => t.modalidad === "presencial")).toMatchObject({ sede_id: 3, aula_id: 4, hora: "14:00" });
  });

  it("no genera nada con una duración fuera de rango", () => {
    expect(generarTurnos({ disponibilidad: [lunes9a11], duracionMin: 5, ahora: AHORA, dias: 7 })).toEqual([]);
  });
});

describe("validarDisponibilidad", () => {
  it("normaliza horas y limpia sede/aula en bloques virtuales", () => {
    const r = validarDisponibilidad([
      { dia_semana: "1", hora_inicio: "9:00:00", hora_fin: "11:00", modalidad: "virtual", sede_id: 2 },
    ]);
    expect(r).toEqual({
      ok: true,
      items: [
        {
          dia_semana: 1,
          hora_inicio: "09:00",
          hora_fin: "11:00",
          modalidad: "virtual",
          sede_id: null,
          aula_id: null,
          vigente_desde: null,
          vigente_hasta: null,
        },
      ],
    });
  });

  it("rechaza fin anterior al inicio, modalidad inválida y bloques solapados", () => {
    expect(validarDisponibilidad([{ dia_semana: 1, hora_inicio: "11:00", hora_fin: "09:00", modalidad: "virtual" }]).ok).toBe(false);
    expect(validarDisponibilidad([{ dia_semana: 1, hora_inicio: "09:00", hora_fin: "10:00", modalidad: "hibrida" }]).ok).toBe(false);
    const solapados = validarDisponibilidad([
      { dia_semana: 2, hora_inicio: "09:00", hora_fin: "11:00", modalidad: "virtual" },
      { dia_semana: 2, hora_inicio: "10:30", hora_fin: "12:00", modalidad: "presencial" },
    ]);
    expect(solapados).toEqual({ ok: false, error: "Los bloques 1 y 2 (Martes) se solapan." });
  });

  it("permite el mismo horario en vigencias que no se cruzan", () => {
    const r = validarDisponibilidad([
      { dia_semana: 2, hora_inicio: "09:00", hora_fin: "11:00", modalidad: "virtual", vigente_hasta: "2026-12-31" },
      { dia_semana: 2, hora_inicio: "09:00", hora_fin: "11:00", modalidad: "virtual", vigente_desde: "2027-01-01" },
    ]);
    expect(r.ok).toBe(true);
  });
});

// La máquina de estados de las reservas se prueba en tests/unit/estadosMentoriaReserva.test.ts.
