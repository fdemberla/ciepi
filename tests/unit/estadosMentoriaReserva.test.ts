import { describe, it, expect } from "vitest";
import { estadosFinales, alcanzables } from "@/lib/estados/comun";
import {
  ESTADOS_RESERVA,
  TRANSICIONES_RESERVA,
  transicionesReserva,
  validarTransicionReserva,
  estadoEfectivoReserva,
  pendienteVencida,
  reservasAfectadasPorDesactivacion,
  decidirDesactivacionMentor,
  type ActorReserva,
  type EstadoReserva,
} from "@/lib/estados/mentoriaReserva";

const AHORA = new Date("2026-12-07T15:00:00Z");
const FUTURO = new Date("2026-12-08T15:00:00Z"); // la sesión aún no empieza
const PASADO = new Date("2026-12-07T14:00:00Z"); // la sesión ya empezó
const EXPIRA_VIGENTE = new Date("2026-12-07T15:10:00Z");
const EXPIRA_VENCIDA = new Date("2026-12-07T14:50:00Z");

const destinos = (
  estado: string,
  actor: ActorReserva,
  o: { inicio?: Date; expira?: Date | null; mentorActivo?: boolean } = {}
) =>
  transicionesReserva(
    { estado, inicio: o.inicio ?? FUTURO, pendiente_expira: o.expira ?? null },
    { actor, ahora: AHORA, mentorActivo: o.mentorActivo }
  ).map((t) => t.a);

describe("mapa TRANSICIONES_RESERVA", () => {
  it("cubre todos los estados", () => {
    expect(Object.keys(TRANSICIONES_RESERVA).sort()).toEqual([...ESTADOS_RESERVA].sort());
  });

  it("expirada y canceladas son finales; realizada/inasistencia solo tienen correcciones (override)", () => {
    expect(estadosFinales(TRANSICIONES_RESERVA).sort()).toEqual(
      ["cancelada_ciepi", "cancelada_usuario", "completada", "expirada", "no_asistio"].sort()
    );
    for (const e of ["expirada", "cancelada_usuario", "cancelada_ciepi"] as EstadoReserva[]) {
      expect(TRANSICIONES_RESERVA[e]).toEqual([]);
    }
  });

  it("todos los estados son alcanzables desde pendiente_verificacion", () => {
    expect([...alcanzables(TRANSICIONES_RESERVA, "pendiente_verificacion")].sort()).toEqual([...ESTADOS_RESERVA].sort());
  });

  it("toda cancelación de CIEPI y toda corrección exigen motivo", () => {
    for (const lista of Object.values(TRANSICIONES_RESERVA)) {
      for (const t of lista) {
        if (t.a === "cancelada_ciepi" || t.override) expect(t.requiereMotivo).toBe(true);
      }
    }
  });
});

describe("matriz de transiciones por actor", () => {
  it("admin: antes de la sesión solo puede cancelar (confirmada o pendiente vigente)", () => {
    expect(destinos("confirmada", "admin")).toEqual(["cancelada_ciepi"]);
    expect(destinos("pendiente_verificacion", "admin", { expira: EXPIRA_VIGENTE })).toEqual(["cancelada_ciepi"]);
  });

  it("admin: desde que empieza marca realizada o inasistencia (también justo a la hora)", () => {
    expect(destinos("confirmada", "admin", { inicio: PASADO })).toEqual(["completada", "no_asistio"]);
    expect(destinos("confirmada", "admin", { inicio: AHORA })).toEqual(["completada", "no_asistio"]);
  });

  it("admin: realizada e inasistencia se corrigen entre sí", () => {
    expect(destinos("completada", "admin", { inicio: PASADO })).toEqual(["no_asistio"]);
    expect(destinos("no_asistio", "admin", { inicio: PASADO })).toEqual(["completada"]);
    const [t] = transicionesReserva({ estado: "completada", inicio: PASADO }, { actor: "admin", ahora: AHORA });
    expect(t).toMatchObject({ accion: "corregir", override: true, requiereMotivo: true });
  });

  it("admin: estados finales y pendiente ya empezada no tienen transiciones", () => {
    for (const e of ["expirada", "cancelada_usuario", "cancelada_ciepi"]) expect(destinos(e, "admin")).toEqual([]);
    expect(destinos("pendiente_verificacion", "admin", { inicio: PASADO, expira: EXPIRA_VIGENTE })).toEqual([]);
  });

  it("ciudadano: confirma su pendiente vigente y cancela su confirmada futura", () => {
    expect(destinos("pendiente_verificacion", "ciudadano", { expira: EXPIRA_VIGENTE })).toEqual(["confirmada"]);
    expect(destinos("confirmada", "ciudadano")).toEqual(["cancelada_usuario"]);
    expect(destinos("confirmada", "ciudadano", { inicio: PASADO })).toEqual([]);
    for (const e of ["completada", "no_asistio", "expirada", "cancelada_usuario", "cancelada_ciepi"]) {
      expect(destinos(e, "ciudadano", { inicio: PASADO })).toEqual([]);
    }
  });

  it("ciudadano: no confirma si el mentor ya no está disponible", () => {
    expect(destinos("pendiente_verificacion", "ciudadano", { expira: EXPIRA_VIGENTE, mentorActivo: false })).toEqual([]);
    const v = validarTransicionReserva(
      { estado: "pendiente_verificacion", inicio: FUTURO, pendiente_expira: EXPIRA_VIGENTE },
      "confirmada",
      { actor: "ciudadano", ahora: AHORA, mentorActivo: false }
    );
    expect(v).toMatchObject({ ok: false, status: 403, motivo: "Este mentor ya no está disponible." });
  });

  it("sistema: solo expira pendientes", () => {
    expect(destinos("pendiente_verificacion", "sistema", { expira: EXPIRA_VENCIDA })).toEqual(["expirada"]);
    expect(destinos("confirmada", "sistema")).toEqual([]);
  });

  it("nadie más que el sistema puede expirar", () => {
    for (const actor of ["admin", "ciudadano"] as ActorReserva[]) {
      const v = validarTransicionReserva(
        { estado: "pendiente_verificacion", inicio: FUTURO, pendiente_expira: EXPIRA_VIGENTE },
        "expirada",
        { actor, ahora: AHORA }
      );
      expect(v.ok).toBe(false);
    }
  });
});

describe("pendiente vencida (expirada derivada)", () => {
  it("se detecta con pendiente_expira <= ahora", () => {
    expect(pendienteVencida("pendiente_verificacion", EXPIRA_VENCIDA, AHORA)).toBe(true);
    expect(pendienteVencida("pendiente_verificacion", AHORA, AHORA)).toBe(true);
    expect(pendienteVencida("pendiente_verificacion", EXPIRA_VIGENTE, AHORA)).toBe(false);
    expect(pendienteVencida("confirmada", EXPIRA_VENCIDA, AHORA)).toBe(false);
    expect(estadoEfectivoReserva("pendiente_verificacion", EXPIRA_VENCIDA.toISOString(), AHORA)).toBe("expirada");
    expect(estadoEfectivoReserva("pendiente_verificacion", EXPIRA_VIGENTE, AHORA)).toBe("pendiente_verificacion");
  });

  it("el admin no ve transiciones en una pendiente vencida (se muestra como expirada)", () => {
    expect(destinos("pendiente_verificacion", "admin", { expira: EXPIRA_VENCIDA })).toEqual([]);
  });

  it("ni el admin la cancela ni la persona la confirma: 410", () => {
    const r = { estado: "pendiente_verificacion", inicio: FUTURO, pendiente_expira: EXPIRA_VENCIDA };
    expect(validarTransicionReserva(r, "cancelada_ciepi", { actor: "admin", ahora: AHORA, motivo: "x" })).toMatchObject({
      ok: false,
      status: 410,
    });
    expect(validarTransicionReserva(r, "confirmada", { actor: "ciudadano", ahora: AHORA })).toMatchObject({
      ok: false,
      status: 410,
    });
  });

  it("el sistema sí la expira", () => {
    const r = { estado: "pendiente_verificacion", inicio: FUTURO, pendiente_expira: EXPIRA_VENCIDA };
    expect(validarTransicionReserva(r, "expirada", { actor: "sistema", ahora: AHORA })).toMatchObject({
      ok: true,
      transicion: { accion: "expirar" },
    });
  });
});

describe("validarTransicionReserva", () => {
  it("la cancelación de CIEPI exige motivo", () => {
    const r = { estado: "confirmada", inicio: FUTURO };
    expect(validarTransicionReserva(r, "cancelada_ciepi", { actor: "admin", ahora: AHORA })).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(
      validarTransicionReserva(r, "cancelada_ciepi", { actor: "admin", ahora: AHORA, motivo: "Imprevisto" })
    ).toMatchObject({ ok: true, transicion: { a: "cancelada_ciepi", accion: "cancelar" } });
  });

  it("no se cancela una sesión que ya empezó", () => {
    const r = { estado: "confirmada", inicio: PASADO };
    expect(
      validarTransicionReserva(r, "cancelada_ciepi", { actor: "admin", ahora: AHORA, motivo: "x" })
    ).toMatchObject({ ok: false, status: 403 });
    expect(validarTransicionReserva(r, "cancelada_usuario", { actor: "ciudadano", ahora: AHORA })).toMatchObject({
      ok: false,
      status: 403,
    });
  });

  it("no se marca realizada antes de la sesión", () => {
    expect(
      validarTransicionReserva({ estado: "confirmada", inicio: FUTURO }, "completada", { actor: "admin", ahora: AHORA })
    ).toMatchObject({ ok: false, status: 403 });
  });

  it("estados desconocidos o iguales se rechazan", () => {
    expect(validarTransicionReserva({ estado: "x", inicio: FUTURO }, "confirmada", { actor: "admin", ahora: AHORA }).ok).toBe(
      false
    );
    expect(
      validarTransicionReserva({ estado: "confirmada", inicio: FUTURO }, "confirmada", { actor: "ciudadano", ahora: AHORA })
    ).toMatchObject({ ok: false, status: 400 });
    expect(
      validarTransicionReserva({ estado: "cancelada_ciepi", inicio: FUTURO }, "confirmada", { actor: "admin", ahora: AHORA })
    ).toMatchObject({ ok: false, status: 400 });
  });
});

describe("desactivar mentor", () => {
  const reservas = [
    { id: 1, estado: "confirmada", inicio: FUTURO },
    { id: 2, estado: "pendiente_verificacion", inicio: FUTURO, pendiente_expira: EXPIRA_VIGENTE },
    { id: 3, estado: "pendiente_verificacion", inicio: FUTURO, pendiente_expira: EXPIRA_VENCIDA },
    { id: 4, estado: "confirmada", inicio: PASADO },
    { id: 5, estado: "cancelada_usuario", inicio: FUTURO },
  ];

  it("afectadas: confirmadas y pendientes vigentes que aún no empiezan", () => {
    expect(reservasAfectadasPorDesactivacion(reservas, AHORA).map((r) => r.id)).toEqual([1, 2]);
  });

  it("si sigue activo como mentor, continúa sin tocar nada", () => {
    expect(
      decidirDesactivacionMentor({ esMentor: true, activo: true, reservas, cancelarReservas: false, ahora: AHORA })
    ).toEqual({ tipo: "continuar" });
  });

  it("sin reservas afectadas, se puede desactivar", () => {
    expect(
      decidirDesactivacionMentor({ esMentor: false, activo: true, reservas: reservas.slice(2), cancelarReservas: false, ahora: AHORA })
    ).toEqual({ tipo: "continuar" });
  });

  it("con reservas afectadas y sin pedirlo, se bloquea (409) con la lista", () => {
    for (const [esMentor, activo] of [
      [false, true],
      [true, false],
      [false, false],
    ]) {
      const d = decidirDesactivacionMentor({ esMentor, activo, reservas, cancelarReservas: false, ahora: AHORA });
      expect(d.tipo).toBe("bloquear");
      expect(d.tipo !== "continuar" && d.reservas.map((r) => r.id)).toEqual([1, 2]);
    }
  });

  it("con cancelar_reservas, se cancelan solo las afectadas y el admin puede hacerlo", () => {
    const d = decidirDesactivacionMentor({ esMentor: false, activo: true, reservas, cancelarReservas: true, ahora: AHORA });
    expect(d.tipo).toBe("cancelar");
    if (d.tipo !== "cancelar") return;
    expect(d.reservas.map((r) => r.id)).toEqual([1, 2]);
    for (const r of d.reservas) {
      expect(
        validarTransicionReserva(r, "cancelada_ciepi", { actor: "admin", ahora: AHORA, motivo: "Mentor no disponible" }).ok
      ).toBe(true);
    }
  });
});
