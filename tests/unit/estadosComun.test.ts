import { describe, it, expect, vi } from "vitest";
import {
  alcanzables,
  estadosFinales,
  transicionesPermitidas,
  validarTransicion,
  type MapaTransiciones,
} from "@/lib/estados/comun";
import { cambiarEstado, ErrorTransicion } from "@/lib/estadosServer";

type E = "a" | "b" | "c";
const MAPA: MapaTransiciones<E, { rol?: number; autor?: boolean }> = {
  a: [
    { a: "b", accion: "avanzar", etiqueta: "Avanzar", roles: [1] },
    { a: "c", accion: "cerrar", etiqueta: "Cerrar", requiereMotivo: true, guarda: (c) => (c.autor ? "El autor no puede" : null) },
  ],
  b: [{ a: "c", accion: "cerrar", etiqueta: "Cerrar" }],
  c: [{ a: "a", accion: "reabrir", etiqueta: "Reabrir", roles: [1], override: true }],
};

describe("estados/comun", () => {
  it("filtra por rol y guarda", () => {
    expect(transicionesPermitidas(MAPA, "a", { rol: 1 }).map((t) => t.a)).toEqual(["b", "c"]);
    expect(transicionesPermitidas(MAPA, "a", { rol: 2 }).map((t) => t.a)).toEqual(["c"]);
    expect(transicionesPermitidas(MAPA, "a", { rol: 1, autor: true }).map((t) => t.a)).toEqual(["b"]);
  });

  it("valida estado, rol, guarda y motivo", () => {
    expect(validarTransicion(MAPA, "a", "a", { rol: 1 })).toMatchObject({ ok: false, status: 400 });
    expect(validarTransicion(MAPA, "b", "a", { rol: 1 })).toMatchObject({ ok: false, status: 400 });
    expect(validarTransicion(MAPA, "a", "b", { rol: 2 })).toMatchObject({ ok: false, status: 403 });
    expect(validarTransicion(MAPA, "a", "c", { rol: 1, autor: true, motivo: "x" })).toMatchObject({ ok: false, status: 403 });
    expect(validarTransicion(MAPA, "a", "c", { rol: 1 })).toMatchObject({ ok: false, status: 400 });
    expect(validarTransicion(MAPA, "a", "c", { rol: 1, motivo: " ok " })).toMatchObject({ ok: true });
    expect(validarTransicion(MAPA, "c", "a", { rol: 1 })).toMatchObject({ ok: true, transicion: { override: true } });
  });

  it("finales y alcanzables", () => {
    expect(estadosFinales(MAPA)).toEqual(["c"]);
    expect([...alcanzables(MAPA, "a")].sort()).toEqual(["a", "b", "c"]);
  });
});

describe("estadosServer.cambiarEstado", () => {
  const base = {
    entidad: "consulta" as const,
    tabla: "ciepi.consultas",
    columnaEstado: "estado",
    id: 5,
    de: "pendiente",
    a: "respondida",
    accion: "responder",
    actor: { tipo: "admin" as const, id: 3 },
  };

  it("UPDATE condicionado al estado leído + historial", async () => {
    const q = vi.fn().mockResolvedValueOnce({ rows: [{ id: 5 }] }).mockResolvedValueOnce({ rows: [] });
    await cambiarEstado(q, { ...base, extra: { respuesta: "hola" } });
    const [sql, params] = q.mock.calls[0];
    expect(sql).toContain("WHERE id = $2 AND estado = $3");
    expect(params).toEqual(["respondida", 5, "pendiente", "hola"]);
    expect(q.mock.calls[1][0]).toContain("INSERT INTO ciepi.estado_historial");
  });

  it("409 si el estado cambió; 404 si no existe", async () => {
    const q409 = vi.fn().mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [{ "?column?": 1 }] });
    await expect(cambiarEstado(q409, base)).rejects.toMatchObject({ status: 409 });
    const q404 = vi.fn().mockResolvedValue({ rows: [] });
    await expect(cambiarEstado(q404, base)).rejects.toBeInstanceOf(ErrorTransicion);
  });

  it("rechaza identificadores SQL no constantes", async () => {
    const q = vi.fn();
    await expect(cambiarEstado(q, { ...base, extra: { "x; DROP": 1 } })).rejects.toThrow("Identificador");
    expect(q).not.toHaveBeenCalled();
  });
});
