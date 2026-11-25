import { describe, it, expect, afterEach, vi } from "vitest";
import { isTurnstileEnabled, verifyTurnstileToken } from "@/lib/turnstile";

describe("turnstile helper", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("skips verification when TURNSTILE_SECRET_KEY is not configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(isTurnstileEnabled()).toBe(false);
    const res = await verifyTurnstileToken("");
    expect(res).toEqual({ success: true, skipped: true });
  });

  it("rejects empty token when TURNSTILE_SECRET_KEY is configured", async () => {
    vi.stubEnv("TURNSTILE_SECRET_KEY", "test-secret");
    expect(isTurnstileEnabled()).toBe(true);
    const res = await verifyTurnstileToken("");
    expect(res.success).toBe(false);
  });
});
