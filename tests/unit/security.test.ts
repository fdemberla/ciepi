import { describe, it, expect } from "vitest";
import { buildSafeFileUrl, isSafeUrl } from "@/lib/security";

describe("buildSafeFileUrl", () => {
  it("permite rutas de adjuntos que contienen 'on' (regresión)", () => {
    expect(buildSafeFileUrl("", "/attachments/1761228795144-informacion.pdf")).toBe(
      "/attachments/1761228795144-informacion.pdf"
    );
    expect(buildSafeFileUrl("/ciepi", "/attachments/123-Convocatoria.docx")).toBe(
      "/ciepi/attachments/123-Convocatoria.docx"
    );
  });

  it("rechaza manejadores de eventos y protocolos peligrosos", () => {
    expect(buildSafeFileUrl("", "/x onerror=alert(1)")).toBe("");
    expect(buildSafeFileUrl("", "javascript:alert(1)")).toBe("");
    expect(buildSafeFileUrl("", "/a%3Cscript%3E")).toBe("");
    expect(buildSafeFileUrl("", '/a"><img')).toBe("");
  });

  it("devuelve vacío sin ruta", () => {
    expect(buildSafeFileUrl("", null)).toBe("");
  });
});

describe("isSafeUrl", () => {
  it("acepta http(s) y rutas relativas", () => {
    expect(isSafeUrl("https://example.com/condiciones")).toBe(true);
    expect(isSafeUrl("/blog/acerca-de-nosotros")).toBe(true);
  });

  it("rechaza otros protocolos", () => {
    expect(isSafeUrl("ftp://example.com")).toBe(false);
    expect(isSafeUrl("data:text/html,hi")).toBe(false);
  });
});
