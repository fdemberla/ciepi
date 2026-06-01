import { describe, it, expect, afterEach, vi } from "vitest";
import { getClientIp, getBaseUrl } from "@/lib/verificationUtils";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRequest(headers: Record<string, string>): Request {
  return new Request("http://localhost/test", { headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

// ─── getClientIp ─────────────────────────────────────────────────────────────

describe("getClientIp — Cloudflare cf-connecting-ip takes priority", () => {
  it("returns cf-connecting-ip when present, ignoring x-forwarded-for", () => {
    const req = makeRequest({
      "cf-connecting-ip": "9.9.9.9",
      "x-forwarded-for": "1.1.1.1, 2.2.2.2",
    });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });

  it("trims whitespace from cf-connecting-ip", () => {
    const req = makeRequest({ "cf-connecting-ip": "  9.9.9.9  " });
    expect(getClientIp(req)).toBe("9.9.9.9");
  });
});

describe("getClientIp — x-forwarded-for uses LAST IP (spoof protection)", () => {
  it("returns the last IP in a multi-IP x-forwarded-for chain", () => {
    const req = makeRequest({ "x-forwarded-for": "1.1.1.1, 2.2.2.2, 3.3.3.3" });
    // 3.3.3.3 is the IP added by our trusted reverse proxy — client cannot fake it
    expect(getClientIp(req)).toBe("3.3.3.3");
  });

  it("returns the only IP when x-forwarded-for has one value", () => {
    const req = makeRequest({ "x-forwarded-for": "5.5.5.5" });
    expect(getClientIp(req)).toBe("5.5.5.5");
  });

  it("does NOT return the first IP (which a client can forge)", () => {
    const req = makeRequest({ "x-forwarded-for": "ATTACKER_IP, 2.2.2.2, PROXY_IP" });
    const ip = getClientIp(req);
    expect(ip).not.toBe("ATTACKER_IP");
    expect(ip).toBe("PROXY_IP");
  });
});

describe("getClientIp — x-real-ip fallback", () => {
  it("returns x-real-ip when no cf-connecting-ip or x-forwarded-for", () => {
    const req = makeRequest({ "x-real-ip": "5.5.5.5" });
    expect(getClientIp(req)).toBe("5.5.5.5");
  });

  it("trims whitespace from x-real-ip", () => {
    const req = makeRequest({ "x-real-ip": "  5.5.5.5  " });
    expect(getClientIp(req)).toBe("5.5.5.5");
  });
});

describe("getClientIp — returns null when no headers present", () => {
  it("returns null for an empty request", () => {
    const req = makeRequest({});
    expect(getClientIp(req)).toBeNull();
  });
});

// ─── getBaseUrl ───────────────────────────────────────────────────────────────

describe("getBaseUrl — production HTTPS enforcement", () => {
  it("throws when NEXT_PUBLIC_APP_URL uses HTTP in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://evil.com");
    expect(() => getBaseUrl()).toThrow(
      "NEXT_PUBLIC_APP_URL must use HTTPS in production"
    );
  });

  it("does NOT throw when NEXT_PUBLIC_APP_URL uses HTTPS in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://secure.example.com");
    expect(() => getBaseUrl()).not.toThrow();
    expect(getBaseUrl()).toBe("https://secure.example.com");
  });

  it("allows HTTP in development even with NEXT_PUBLIC_APP_URL set", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "http://localhost:3000/ciepi");
    expect(() => getBaseUrl()).not.toThrow();
  });
});

describe("getBaseUrl — fallback to localhost in development", () => {
  it("returns localhost when NEXT_PUBLIC_APP_URL is not set", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    const url = getBaseUrl();
    expect(url).toMatch(/^http:\/\/localhost:3000/);
  });
});
