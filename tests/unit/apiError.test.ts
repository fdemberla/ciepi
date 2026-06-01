import { describe, it, expect, afterEach, vi } from "vitest";
import { safeErrorDetail } from "@/lib/apiError";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("safeErrorDetail — production mode", () => {
  it("returns undefined for an Error instance (prevents stack/schema leak)", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(safeErrorDetail(new Error("db password hint"))).toBeUndefined();
  });

  it("returns undefined for a string error", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(safeErrorDetail("some error string")).toBeUndefined();
  });

  it("returns undefined for null", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(safeErrorDetail(null)).toBeUndefined();
  });

  it("returns undefined for undefined", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(safeErrorDetail(undefined)).toBeUndefined();
  });
});

describe("safeErrorDetail — development mode", () => {
  it("returns the error message for an Error instance", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(safeErrorDetail(new Error("secret db message"))).toBe("secret db message");
  });

  it("returns 'Unknown error' for a non-Error value", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(safeErrorDetail("plain string")).toBe("Unknown error");
    expect(safeErrorDetail(42)).toBe("Unknown error");
    expect(safeErrorDetail(null)).toBe("Unknown error");
    expect(safeErrorDetail({ msg: "obj" })).toBe("Unknown error");
  });

  it("returns the message for nested errors", () => {
    vi.stubEnv("NODE_ENV", "development");
    const err = new TypeError("type mismatch");
    expect(safeErrorDetail(err)).toBe("type mismatch");
  });
});
