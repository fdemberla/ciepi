import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

const mockQuery = vi.fn();
const txQuery = vi.fn();

vi.mock("@/lib/db", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withTransaction: async (fn: (q: typeof txQuery) => unknown) => fn(txQuery),
}));

import {
  createVerificationToken,
  estadoPorConsulta,
  reenviarVerificacion,
} from "@/lib/verificationToken";

const sha = (v: string) => createHash("sha256").update(v).digest("hex");

describe("verificationToken", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    txQuery.mockReset();
  });

  it("crea token y consulta distintos y guarda solo sus hashes", async () => {
    txQuery
      .mockResolvedValueOnce({ rows: [] }) // invalidar anteriores
      .mockResolvedValueOnce({ rows: [{ id: 7, fecha_expiracion: new Date() }] });

    const r = await createVerificationToken({
      id_estudiante: null,
      cedula: "8-1-1",
      correo: "a@example.com",
      tipo: "inscripcion",
      metadata: { capacitacion_id: 3 },
    });

    expect(r.token).toMatch(/^[a-f0-9]{64}$/);
    expect(r.consulta).toMatch(/^[a-f0-9]{64}$/);
    expect(r.token).not.toBe(r.consulta);

    const [invalidarSql, invalidarParams] = txQuery.mock.calls[0];
    expect(invalidarSql).toContain("metadata->>'capacitacion_id'");
    expect(invalidarParams).toEqual(["8-1-1", "inscripcion", "3"]);

    const insertParams = txQuery.mock.calls[1][1] as unknown[];
    expect(insertParams[2]).toBe(sha(r.token));
    expect(insertParams[3]).toBe(sha(r.consulta));
    expect(insertParams).not.toContain(r.token);
  });

  it("estadoPorConsulta deriva 'expirado' de la fecha", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          estado: "pendiente",
          reenvios: 0,
          correo: "a@example.com",
          fecha_creacion: new Date(Date.now() - 20 * 60_000),
          fecha_expiracion: new Date(Date.now() - 60_000),
        },
      ],
    });
    const info = await estadoPorConsulta("b".repeat(64));
    expect(info?.estado).toBe("expirado");
    expect(mockQuery.mock.calls[0][1]).toEqual([sha("b".repeat(64))]);
  });

  it("rechaza identificadores con formato inválido sin consultar la base", async () => {
    expect(await estadoPorConsulta("../../etc")).toBeNull();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("reenvío: misma fila, UPDATE condicionado al estado y al contador", async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 9,
            estado: "pendiente",
            reenvios: 1,
            correo: "a@example.com",
            metadata: {},
            fecha_creacion: new Date(Date.now() - 5 * 60_000),
            fecha_expiracion: new Date(Date.now() + 60_000),
          },
        ],
      })
      .mockResolvedValueOnce({ rows: [{ fecha_expiracion: new Date() }] });

    const r = await reenviarVerificacion({ consulta: "c".repeat(64) });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.consulta).toBeNull(); // desde la página de espera no cambia la URL

    const [sql, params] = mockQuery.mock.calls[1];
    expect(sql).toContain("estado = 'pendiente' AND reenvios = $2");
    expect(params[0]).toBe(9);
    expect(params[1]).toBe(1);
  });

  it("reenvío: no permitido si ya se verificó", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          id: 9,
          estado: "verificado",
          reenvios: 0,
          fecha_creacion: new Date(0),
          fecha_expiracion: new Date(0),
        },
      ],
    });
    const r = await reenviarVerificacion({ token: "d".repeat(64) });
    expect(r).toMatchObject({ ok: false, status: 409 });
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
