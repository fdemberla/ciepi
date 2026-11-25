import { describe, it, expect } from "vitest";
import { alcanzables, estadosFinales } from "@/lib/estados/comun";
import {
  ESTADOS_CONSULTA,
  TRANSICIONES_CONSULTA,
  puedeEliminarConsulta,
  transicionesConsulta,
  validarAccionConsulta,
  type EstadoConsulta,
} from "@/lib/estados/consulta";
import { Role } from "@/lib/permissions";

const ADMIN = Role.ADMIN;
const SUPER = Role.SUPER_ADMIN;
const CIEPI = Role.CIEPI;
const RP = Role.RELACIONES_PUBLICAS;

describe("estados/consulta: matriz de transiciones", () => {
  const matriz: Record<EstadoConsulta, string[]> = {
    pendiente: ["tomar:en_proceso", "responder:respondida", "cerrar:cerrada"],
    en_proceso: ["responder:respondida", "cerrar:cerrada"],
    respondida: ["cerrar:cerrada", "reabrir:en_proceso"],
    cerrada: ["reabrir:en_proceso"],
  };

  it.each(ESTADOS_CONSULTA)("ADMIN desde %s", (estado) => {
    expect(transicionesConsulta(estado, ADMIN).map((t) => `${t.accion}:${t.a}`)).toEqual(matriz[estado]);
  });

  it.each([CIEPI, RP])("rol %s atiende pero no reabre", (rol) => {
    expect(transicionesConsulta("pendiente", rol).map((t) => t.accion)).toEqual(["tomar", "responder", "cerrar"]);
    expect(transicionesConsulta("en_proceso", rol).map((t) => t.accion)).toEqual(["responder", "cerrar"]);
    expect(transicionesConsulta("respondida", rol).map((t) => t.accion)).toEqual(["cerrar"]);
    expect(transicionesConsulta("cerrada", rol)).toEqual([]);
  });

  it("sin rol o estado desconocido no hay acciones", () => {
    expect(transicionesConsulta("pendiente", undefined)).toEqual([]);
    expect(transicionesConsulta("", ADMIN)).toEqual([]);
    expect(transicionesConsulta("borrada", ADMIN)).toEqual([]);
  });

  it("todos los estados son alcanzables desde pendiente y cerrada es final", () => {
    expect([...alcanzables(TRANSICIONES_CONSULTA, "pendiente")].sort()).toEqual([...ESTADOS_CONSULTA].sort());
    expect(estadosFinales(TRANSICIONES_CONSULTA)).toEqual(["cerrada"]);
  });

  it("solo ADMIN/SUPER_ADMIN pueden eliminar", () => {
    expect([ADMIN, SUPER, CIEPI, RP, undefined].map(puedeEliminarConsulta)).toEqual([true, true, false, false, false]);
  });
});

describe("estados/consulta: validarAccionConsulta", () => {
  it("responder exige texto y siempre deja respondida", () => {
    for (const de of ["pendiente", "en_proceso"] as const) {
      const r = validarAccionConsulta({ estadoActual: de, accion: "responder", respuesta: "  Hola  ", rol: CIEPI });
      expect(r).toMatchObject({ ok: true, de, respuesta: "Hola", transicion: { a: "respondida", accion: "responder" } });
    }
    expect(validarAccionConsulta({ estadoActual: "pendiente", accion: "responder", respuesta: "   ", rol: ADMIN })).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(validarAccionConsulta({ estadoActual: "pendiente", accion: "responder", rol: ADMIN })).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(
      validarAccionConsulta({ estadoActual: "pendiente", accion: "responder", respuesta: "x".repeat(5001), rol: ADMIN })
    ).toMatchObject({ ok: false, status: 400 });
  });

  it("no se responde desde respondida ni cerrada", () => {
    for (const de of ["respondida", "cerrada"] as const) {
      expect(validarAccionConsulta({ estadoActual: de, accion: "responder", respuesta: "x", rol: ADMIN })).toMatchObject({
        ok: false,
        status: 400,
      });
    }
  });

  it("estado actual o acción vacíos dan 400 (nunca error de BD)", () => {
    expect(validarAccionConsulta({ estadoActual: "", accion: "cerrar", rol: ADMIN })).toMatchObject({ ok: false, status: 400 });
    expect(validarAccionConsulta({ estadoActual: undefined, accion: "cerrar", rol: ADMIN })).toMatchObject({ ok: false, status: 400 });
    expect(validarAccionConsulta({ estadoActual: "pendiente", accion: "", rol: ADMIN })).toMatchObject({ ok: false, status: 400 });
    expect(validarAccionConsulta({ estadoActual: "pendiente", estadoDestino: "", rol: ADMIN })).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(validarAccionConsulta({ estadoActual: "pendiente", accion: "borrar", rol: ADMIN })).toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it("acepta el estado destino en lugar de la acción", () => {
    expect(validarAccionConsulta({ estadoActual: "pendiente", estadoDestino: "en_proceso", rol: RP })).toMatchObject({
      ok: true,
      transicion: { accion: "tomar" },
    });
    expect(validarAccionConsulta({ estadoActual: "cerrada", estadoDestino: "pendiente", rol: ADMIN })).toMatchObject({
      ok: false,
      status: 400,
    });
  });

  it("cerrada solo se reabre con override de ADMIN/SUPER_ADMIN y motivo", () => {
    expect(validarAccionConsulta({ estadoActual: "cerrada", accion: "reabrir", motivo: "x", rol: CIEPI })).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(validarAccionConsulta({ estadoActual: "cerrada", accion: "reabrir", rol: ADMIN })).toMatchObject({
      ok: false,
      status: 400,
    });
    for (const rol of [ADMIN, SUPER]) {
      expect(
        validarAccionConsulta({ estadoActual: "cerrada", accion: "reabrir", motivo: " Faltó información ", rol })
      ).toMatchObject({ ok: true, motivo: "Faltó información", transicion: { a: "en_proceso", override: true } });
    }
  });

  it("reabrir una respondida es solo de admin pero no es override", () => {
    expect(validarAccionConsulta({ estadoActual: "respondida", accion: "reabrir", rol: RP })).toMatchObject({
      ok: false,
      status: 403,
    });
    expect(validarAccionConsulta({ estadoActual: "respondida", accion: "reabrir", rol: ADMIN })).toMatchObject({
      ok: true,
      transicion: { override: false },
    });
  });
});
