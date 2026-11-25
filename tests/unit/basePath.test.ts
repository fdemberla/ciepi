import { describe, it, expect, afterEach, vi } from "vitest";
import { assetUrl, getBasePath, withBasePath } from "@/lib/basePath";

describe("basePath helpers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns empty string when NEXT_PUBLIC_BASE_PATH is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    expect(getBasePath()).toBe("");
    expect(withBasePath("/admin/login")).toBe("/admin/login");
  });

  it("normalizes slashes when NEXT_PUBLIC_BASE_PATH is set", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "ciepi/");
    expect(getBasePath()).toBe("/ciepi");
    expect(withBasePath("admin/login")).toBe("/ciepi/admin/login");
    expect(withBasePath("/api/capacitaciones")).toBe(
      "/ciepi/api/capacitaciones",
    );
  });

  it("returns empty string when NEXT_PUBLIC_BASE_PATH is only slashes or spaces", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", " / ");
    expect(getBasePath()).toBe("");
    expect(withBasePath("/")).toBe("/");
  });
});

describe("assetUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sin basePath (subdominio propio) devuelve la ruta tal cual", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "");
    expect(assetUrl("/uploads/blogs/a.png")).toBe("/uploads/blogs/a.png");
  });

  it("con basePath antepone el prefijo", () => {
    vi.stubEnv("NEXT_PUBLIC_BASE_PATH", "/ciepi");
    expect(assetUrl("/uploads/blogs/a.png")).toBe("/ciepi/uploads/blogs/a.png");
  });

  it("deja pasar URLs absolutas y vacíos", () => {
    expect(assetUrl("https://cdn.example.com/a.png")).toBe("https://cdn.example.com/a.png");
    expect(assetUrl(null)).toBe("");
  });
});
