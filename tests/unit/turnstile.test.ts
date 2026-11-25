import { describe, it, expect, afterEach, vi } from "vitest";
import { isTurnstileEnabled, verifyTurnstileToken } from "@/lib/turnstile";
import { isRecaptchaEnabled, verifyRecaptchaToken } from "@/lib/recaptcha";

function mockFetch(respuesta: unknown) {
  const fn = vi.fn().mockResolvedValue({ json: async () => respuesta });
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("turnstile helper", () => {
  it("omite la verificación fuera de producción si falta TURNSTILE_SECRET_KEY (con aviso)", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(isTurnstileEnabled()).toBe(false);
    const res = await verifyTurnstileToken("");
    expect(res).toEqual({ success: true, skipped: true });
    expect(warn).toHaveBeenCalled();
  });

  it("falla cerrado (503) en producción si falta TURNSTILE_SECRET_KEY", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await verifyTurnstileToken("cualquier-token");
    expect(res.success).toBe(false);
    expect(res.status).toBe(503);
    expect(res.error).toBeTruthy();
    expect(error).toHaveBeenCalled();
  });

  it("exige el token si TURNSTILE_SECRET_KEY está configurada", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    const fetchFn = mockFetch({ success: true });
    expect(isTurnstileEnabled()).toBe(true);
    for (const t of ["", "   ", null, undefined]) {
      const res = await verifyTurnstileToken(t);
      expect(res.success).toBe(false);
      expect(res.status).toBe(403);
    }
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("acepta un token válido y rechaza uno inválido", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    mockFetch({ success: true });
    expect((await verifyTurnstileToken("ok", "1.2.3.4")).success).toBe(true);
    mockFetch({ success: false });
    const res = await verifyTurnstileToken("malo");
    expect(res.success).toBe(false);
    expect(res.status).toBe(403);
  });

  it("devuelve 503 si Cloudflare no responde", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("red")));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await verifyTurnstileToken("tok");
    expect(res).toMatchObject({ success: false, status: 503 });
  });
});

describe("recaptcha helper", () => {
  it("omite la verificación fuera de producción si falta RECAPTCHA_SECRET_KEY", async () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("RECAPTCHA_SECRET_KEY", "");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(isRecaptchaEnabled()).toBe(false);
    expect(await verifyRecaptchaToken(undefined)).toEqual({ success: true, skipped: true });
  });

  it("falla cerrado (503) en producción si falta RECAPTCHA_SECRET_KEY", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("RECAPTCHA_SECRET_KEY", "");
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await verifyRecaptchaToken("tok")).toMatchObject({ success: false, status: 503 });
  });

  it("exige el token si la clave está configurada (ya no basta con omitirlo)", async () => {
    vi.stubEnv("RECAPTCHA_SECRET_KEY", "secreto");
    const fetchFn = mockFetch({ success: true, score: 0.9 });
    expect(await verifyRecaptchaToken("")).toMatchObject({ success: false, status: 400 });
    expect(await verifyRecaptchaToken(undefined)).toMatchObject({ success: false, status: 400 });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("valida éxito, puntuación mínima y acción", async () => {
    vi.stubEnv("RECAPTCHA_SECRET_KEY", "secreto");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mockFetch({ success: true, score: 0.9, action: "newsletter" });
    expect(await verifyRecaptchaToken("tok", { accion: "newsletter" })).toEqual({ success: true, score: 0.9 });

    mockFetch({ success: true, score: 0.2, action: "newsletter" });
    expect((await verifyRecaptchaToken("tok", { accion: "newsletter" })).success).toBe(false);

    mockFetch({ success: true, score: 0.9, action: "otra" });
    expect((await verifyRecaptchaToken("tok", { accion: "newsletter" })).success).toBe(false);

    mockFetch({ success: false });
    expect((await verifyRecaptchaToken("tok")).success).toBe(false);
  });
});
