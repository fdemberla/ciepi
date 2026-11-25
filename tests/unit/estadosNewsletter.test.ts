import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockQuery = vi.fn();
const txQuery = vi.fn();
const mockSendEmail = vi.fn();

vi.mock("@/lib/db", () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  withTransaction: async (fn: (q: typeof txQuery) => unknown) => fn(txQuery),
}));
vi.mock("@/lib/smtp", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

import { Role } from "@/lib/permissions";
import { alcanzables, estadosFinales, transicionesPermitidas, validarTransicion } from "@/lib/estados/comun";
import {
  ESTADOS_SUSCRIPTOR,
  TRANSICIONES_NEWSLETTER,
  evaluarConfirmacion,
  eventoSuscripcion,
  puedeGestionarNewsletter,
  type ContextoNewsletter,
  type EstadoSuscriptor,
} from "@/lib/estados/newsletter";
import { createUnsubscribeToken, hashConfirmToken } from "@/lib/newsletter";
import * as confirmarRoute from "@/app/api/newsletter/confirmar/[token]/route";
import * as bajaRoute from "@/app/api/newsletter/baja/[token]/route";
import * as suscribirRoute from "@/app/api/newsletter/suscribir/route";

const ciudadano: ContextoNewsletter = { actor: "ciudadano" };
const AHORA = new Date("2026-11-25T12:00:00Z");
const TOKEN = "a".repeat(64);

describe("máquina de estados del newsletter", () => {
  it("matriz completa de transiciones (ciudadano con token vigente y consentimiento)", () => {
    const ctx: ContextoNewsletter = { actor: "ciudadano", tokenValido: true, tokenExpirado: false, aceptoPolitica: true };
    const permitidas: Record<EstadoSuscriptor, EstadoSuscriptor[]> = {
      pendiente: ["activo", "baja"],
      activo: ["baja"],
      baja: ["pendiente"],
    };
    for (const de of ESTADOS_SUSCRIPTOR) {
      for (const a of ESTADOS_SUSCRIPTOR) {
        const r = validarTransicion(TRANSICIONES_NEWSLETTER, de, a, ctx);
        expect(r.ok, `${de} → ${a}`).toBe(permitidas[de].includes(a));
      }
    }
  });

  it("no hay estados finales y todos son alcanzables desde pendiente", () => {
    expect(estadosFinales(TRANSICIONES_NEWSLETTER)).toEqual([]);
    expect([...alcanzables(TRANSICIONES_NEWSLETTER, "pendiente")].sort()).toEqual(["activo", "baja", "pendiente"]);
  });

  it("confirmar exige actor ciudadano, token válido y no expirado", () => {
    expect(validarTransicion(TRANSICIONES_NEWSLETTER, "pendiente", "activo", ciudadano).ok).toBe(false);
    expect(
      validarTransicion(TRANSICIONES_NEWSLETTER, "pendiente", "activo", { ...ciudadano, tokenValido: true, tokenExpirado: true }).ok
    ).toBe(false);
    expect(
      validarTransicion(TRANSICIONES_NEWSLETTER, "pendiente", "activo", {
        actor: "admin",
        rol: Role.SUPER_ADMIN,
        tokenValido: true,
        tokenExpirado: false,
      }).ok
    ).toBe(false);
  });

  it("baja de admin solo para ADMIN, SUPER_ADMIN y RELACIONES_PUBLICAS", () => {
    for (const rol of [Role.ADMIN, Role.SUPER_ADMIN, Role.RELACIONES_PUBLICAS]) {
      expect(validarTransicion(TRANSICIONES_NEWSLETTER, "activo", "baja", { actor: "admin", rol }).ok).toBe(true);
      expect(puedeGestionarNewsletter(rol)).toBe(true);
    }
    const r = validarTransicion(TRANSICIONES_NEWSLETTER, "activo", "baja", { actor: "admin", rol: Role.CIEPI });
    expect(r.ok).toBe(false);
    expect(puedeGestionarNewsletter(Role.CIEPI)).toBe(false);
    expect(puedeGestionarNewsletter(undefined)).toBe(false);
  });

  it("volver a suscribirse exige ciudadano y nuevo consentimiento", () => {
    expect(validarTransicion(TRANSICIONES_NEWSLETTER, "baja", "pendiente", ciudadano).ok).toBe(false);
    expect(validarTransicion(TRANSICIONES_NEWSLETTER, "baja", "pendiente", { ...ciudadano, aceptoPolitica: true }).ok).toBe(true);
    expect(
      validarTransicion(TRANSICIONES_NEWSLETTER, "baja", "pendiente", { actor: "admin", rol: Role.ADMIN, aceptoPolitica: true }).ok
    ).toBe(false);
  });

  it("la UI de admin solo ofrece 'Dar de baja'", () => {
    const t = transicionesPermitidas(TRANSICIONES_NEWSLETTER, "activo", { actor: "admin", rol: Role.ADMIN });
    expect(t.map((x) => x.a)).toEqual(["baja"]);
    expect(transicionesPermitidas(TRANSICIONES_NEWSLETTER, "pendiente", { actor: "admin", rol: Role.ADMIN }).map((x) => x.a)).toEqual([
      "baja",
    ]);
  });

  it("evaluarConfirmacion: inválido, expirado, de baja, ya confirmada y vigente", () => {
    const enUnaHora = new Date(AHORA.getTime() + 3600_000);
    const haceUnSegundo = new Date(AHORA.getTime() - 1000);
    expect(evaluarConfirmacion(null, AHORA)).toMatchObject({ tipo: "error", status: 404 });
    expect(evaluarConfirmacion({ estado: "pendiente", confirm_token_expiracion: haceUnSegundo }, AHORA)).toMatchObject({
      tipo: "error",
      status: 410,
      codigo: "TOKEN_EXPIRADO",
    });
    expect(evaluarConfirmacion({ estado: "pendiente", confirm_token_expiracion: AHORA }, AHORA)).toMatchObject({ status: 410 });
    expect(evaluarConfirmacion({ estado: "pendiente", confirm_token_expiracion: null }, AHORA)).toMatchObject({ status: 410 });
    expect(evaluarConfirmacion({ estado: "baja", confirm_token_expiracion: enUnaHora }, AHORA)).toMatchObject({ status: 409 });
    expect(evaluarConfirmacion({ estado: "activo", confirm_token_expiracion: haceUnSegundo }, AHORA)).toEqual({ tipo: "ya_confirmada" });
    expect(evaluarConfirmacion({ estado: "pendiente", confirm_token_expiracion: enUnaHora.toISOString() }, AHORA)).toEqual({
      tipo: "confirmar",
    });
  });

  it("eventoSuscripcion según el estado previo", () => {
    expect(eventoSuscripcion(null)).toEqual({ de: null, a: "pendiente", accion: "suscribir" });
    expect(eventoSuscripcion("baja")).toEqual({ de: "baja", a: "pendiente", accion: "resuscribir" });
    expect(eventoSuscripcion("pendiente")).toEqual({ de: "pendiente", a: "pendiente", accion: "renovar_consentimiento" });
    expect(eventoSuscripcion("activo")).toBeNull();
  });
});

// ─── Rutas (base de datos simulada) ─────────────────────────────────────────

const ctxToken = (token: string) => ({ params: Promise.resolve({ token }) });
const req = (url: string, init?: ConstructorParameters<typeof NextRequest>[1]) =>
  new NextRequest(`http://localhost${url}`, init);
const sqlDe = (call: unknown[]) => String(call[0]);

describe("confirmar suscripción", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    txQuery.mockReset();
  });

  it("GET no modifica nada (solo SELECT)", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [{ id: 5, email: "persona@example.com", estado: "pendiente", confirm_token_expiracion: new Date(Date.now() + 3600_000) }],
    });
    const res = await confirmarRoute.GET(req(`/api/newsletter/confirmar/${TOKEN}`), ctxToken(TOKEN));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toMatchObject({ valid: true, estado: "pendiente", yaConfirmada: false });
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(sqlDe(mockQuery.mock.calls[0])).toMatch(/^\s*SELECT/);
    expect(mockQuery.mock.calls[0][1]).toEqual([hashConfirmToken(TOKEN)]);
    expect(txQuery).not.toHaveBeenCalled();
  });

  it("POST confirma con UPDATE condicionado e historial", async () => {
    txQuery
      .mockResolvedValueOnce({
        rows: [{ id: 5, email: "persona@example.com", estado: "pendiente", confirm_token_expiracion: new Date(Date.now() + 3600_000) }],
      })
      .mockResolvedValueOnce({ rows: [{ id: 5, estado: "activo" }] }) // UPDATE
      .mockResolvedValueOnce({ rows: [] }); // historial
    const res = await confirmarRoute.POST(req(`/api/newsletter/confirmar/${TOKEN}`, { method: "POST" }), ctxToken(TOKEN));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);

    expect(sqlDe(txQuery.mock.calls[0])).toContain("FOR UPDATE");
    const [updateSql, updateParams] = txQuery.mock.calls[1] as [string, unknown[]];
    expect(updateSql).toContain("UPDATE ciepi.newsletter_suscriptores");
    expect(updateSql).toContain("estado = $3");
    expect(updateParams.slice(0, 3)).toEqual(["activo", 5, "pendiente"]);
    const [histSql, histParams] = txQuery.mock.calls[2] as [string, unknown[]];
    expect(histSql).toContain("ciepi.estado_historial");
    expect(histParams.slice(0, 6)).toEqual(["newsletter_suscriptor", "5", "pendiente", "activo", "confirmar", "ciudadano"]);
  });

  it("POST repetido es idempotente (ya activa → éxito sin UPDATE)", async () => {
    txQuery.mockResolvedValueOnce({
      rows: [{ id: 5, email: "persona@example.com", estado: "activo", confirm_token_expiracion: new Date(Date.now() - 1000) }],
    });
    const res = await confirmarRoute.POST(req(`/api/newsletter/confirmar/${TOKEN}`, { method: "POST" }), ctxToken(TOKEN));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data).toMatchObject({ success: true, yaConfirmada: true });
    expect(txQuery).toHaveBeenCalledTimes(1);
  });

  it("POST con token expirado responde 410 sin UPDATE", async () => {
    txQuery.mockResolvedValueOnce({
      rows: [{ id: 5, email: "persona@example.com", estado: "pendiente", confirm_token_expiracion: new Date(Date.now() - 1000) }],
    });
    const res = await confirmarRoute.POST(req(`/api/newsletter/confirmar/${TOKEN}`, { method: "POST" }), ctxToken(TOKEN));
    expect(res.status).toBe(410);
    expect(txQuery).toHaveBeenCalledTimes(1);
  });

  it("token con formato inválido → 400 sin tocar la BD", async () => {
    const res = await confirmarRoute.POST(req("/api/newsletter/confirmar/xyz", { method: "POST" }), ctxToken("xyz"));
    expect(res.status).toBe(400);
    expect(txQuery).not.toHaveBeenCalled();
  });
});

describe("baja del boletín", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    txQuery.mockReset();
  });

  it("POST da de baja con UPDATE condicionado e historial", async () => {
    const token = createUnsubscribeToken(9, "persona@example.com");
    txQuery
      .mockResolvedValueOnce({ rows: [{ id: 9, estado: "activo" }] })
      .mockResolvedValueOnce({ rows: [{ id: 9, estado: "baja" }] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await bajaRoute.POST(req(`/api/newsletter/baja/${token}`, { method: "POST" }), ctxToken(token));
    expect(res.status).toBe(200);
    const [updateSql, updateParams] = txQuery.mock.calls[1] as [string, unknown[]];
    expect(updateSql).toContain("confirm_token_hash = ");
    expect(updateParams.slice(0, 3)).toEqual(["baja", 9, "activo"]);
    expect((txQuery.mock.calls[2][1] as unknown[]).slice(2, 5)).toEqual(["activo", "baja", "dar_de_baja"]);
  });

  it("POST repetido es idempotente (ya de baja → éxito sin UPDATE)", async () => {
    const token = createUnsubscribeToken(9, "persona@example.com");
    txQuery.mockResolvedValueOnce({ rows: [{ id: 9, estado: "baja" }] });
    const res = await bajaRoute.POST(req(`/api/newsletter/baja/${token}`, { method: "POST" }), ctxToken(token));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, yaDadoDeBaja: true });
    expect(txQuery).toHaveBeenCalledTimes(1);
  });

  it("GET no modifica nada", async () => {
    const token = createUnsubscribeToken(9, "persona@example.com");
    mockQuery.mockResolvedValueOnce({ rows: [{ id: 9, email: "persona@example.com", estado: "activo" }] });
    const res = await bajaRoute.GET(req(`/api/newsletter/baja/${token}`), ctxToken(token));
    expect(res.status).toBe(200);
    expect(sqlDe(mockQuery.mock.calls[0])).toMatch(/^\s*SELECT/);
    expect(txQuery).not.toHaveBeenCalled();
  });

  it("enlace manipulado → 400", async () => {
    const res = await bajaRoute.POST(req("/api/newsletter/baja/malo", { method: "POST" }), ctxToken("malo"));
    expect(res.status).toBe(400);
  });
});

describe("suscribir (alta atómica)", () => {
  const body = { email: "Persona@Example.com", aceptoPolitica: true };
  const post = () =>
    suscribirRoute.POST(
      req("/api/newsletter/suscribir", {
        method: "POST",
        body: JSON.stringify(body),
        headers: { "Content-Type": "application/json" },
      })
    );

  beforeEach(() => {
    mockQuery.mockReset();
    txQuery.mockReset();
    mockSendEmail.mockReset();
    mockSendEmail.mockResolvedValue(undefined);
  });

  it("usa un único INSERT ... ON CONFLICT que no toca suscriptores activos", async () => {
    txQuery.mockResolvedValueOnce({ rows: [{ id: 3, insertado: true, estado_previo: null }] }).mockResolvedValueOnce({ rows: [] });
    const res = await post();
    expect(res.status).toBe(200);
    const sql = sqlDe(txQuery.mock.calls[0]);
    expect(sql).toContain("ON CONFLICT (email) DO UPDATE");
    expect(sql).toContain("WHERE s.estado <> 'activo'");
    expect((txQuery.mock.calls[0][1] as unknown[])[0]).toBe("persona@example.com");
    const hist = txQuery.mock.calls[1][1] as unknown[];
    expect(hist.slice(0, 6)).toEqual(["newsletter_suscriptor", "3", null, "pendiente", "suscribir", "ciudadano"]);
    expect(String(hist[8])).toContain("Política de Privacidad v");
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("re-suscripción desde baja queda en el historial", async () => {
    txQuery.mockResolvedValueOnce({ rows: [{ id: 3, insertado: false, estado_previo: "baja" }] }).mockResolvedValueOnce({ rows: [] });
    await post();
    expect((txQuery.mock.calls[1][1] as unknown[]).slice(2, 5)).toEqual(["baja", "pendiente", "resuscribir"]);
  });

  it("suscriptor activo: sin cambios, sin historial y sin correo", async () => {
    txQuery.mockResolvedValueOnce({ rows: [] });
    const res = await post();
    expect(await res.json()).toMatchObject({ success: true, alreadySubscribed: true });
    expect(txQuery).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
