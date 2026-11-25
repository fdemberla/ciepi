import { describe, it, expect } from "vitest";
import { verificarSecretoCron } from "@/lib/cronAuth";

const SECRETO = "a".repeat(32);

describe("verificarSecretoCron", () => {
  it("acepta el Bearer correcto", () => {
    expect(verificarSecretoCron(`Bearer ${SECRETO}`, SECRETO)).toBe(true);
    expect(verificarSecretoCron(`bearer   ${SECRETO}  `, SECRETO)).toBe(true);
  });
  it("rechaza secretos distintos, ausentes o sin Bearer", () => {
    expect(verificarSecretoCron(`Bearer ${"b".repeat(32)}`, SECRETO)).toBe(false);
    expect(verificarSecretoCron(`Bearer ${SECRETO}x`, SECRETO)).toBe(false);
    expect(verificarSecretoCron(SECRETO, SECRETO)).toBe(false);
    expect(verificarSecretoCron(null, SECRETO)).toBe(false);
  });
  it("queda deshabilitado sin secreto configurado o con uno muy corto", () => {
    expect(verificarSecretoCron("Bearer ", undefined)).toBe(false);
    expect(verificarSecretoCron("Bearer corto", "corto")).toBe(false);
  });
});
