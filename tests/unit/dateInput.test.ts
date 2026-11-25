import { describe, it, expect } from "vitest";
import { toDateTimeLocalInput } from "@/lib/dateInput";

describe("toDateTimeLocalInput", () => {
  it("usa la hora local, no UTC (regresión del desfase de 5 h en eventos)", () => {
    const local = new Date(2026, 10, 23, 9, 5); // 23 nov 2026 09:05 hora local
    expect(toDateTimeLocalInput(local)).toBe("2026-11-23T09:05");
    expect(toDateTimeLocalInput(local.toISOString())).toBe("2026-11-23T09:05");
  });

  it("devuelve vacío para valores nulos o inválidos", () => {
    expect(toDateTimeLocalInput(null)).toBe("");
    expect(toDateTimeLocalInput("no-es-fecha")).toBe("");
  });
});
