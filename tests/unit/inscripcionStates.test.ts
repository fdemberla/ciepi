import { describe, it, expect } from "vitest";
import { Role } from "@/lib/permissions";
import {
  InscripcionState,
  validateInscripcionTransition,
} from "@/lib/inscripcionStates";

describe("validateInscripcionTransition", () => {
  it("allows valid normal transitions", () => {
    expect(
      validateInscripcionTransition(
        InscripcionState.NUEVA,
        InscripcionState.PENDIENTE_VALIDACION,
        Role.CIEPI,
      ),
    ).toEqual({ allowed: true, isOverride: false });

    expect(
      validateInscripcionTransition(
        InscripcionState.PENDIENTE_VALIDACION,
        InscripcionState.MATRICULADO,
        Role.CIEPI,
      ),
    ).toEqual({ allowed: true, isOverride: false });

    expect(
      validateInscripcionTransition(
        InscripcionState.MATRICULADO,
        InscripcionState.TERMINO_CURSO,
        Role.CIEPI,
      ),
    ).toEqual({ allowed: true, isOverride: false });
  });

  it("blocks invalid normal transitions and terminal state exits for non-admin", () => {
    expect(
      validateInscripcionTransition(
        InscripcionState.NUEVA,
        InscripcionState.TERMINO_CURSO,
        Role.CIEPI,
      ).allowed,
    ).toBe(false);

    expect(
      validateInscripcionTransition(
        InscripcionState.RECHAZADO,
        InscripcionState.PENDIENTE_VALIDACION,
        Role.CIEPI,
      ).allowed,
    ).toBe(false);

    expect(
      validateInscripcionTransition(
        InscripcionState.TERMINO_CURSO,
        InscripcionState.MATRICULADO,
        Role.ADMIN,
      ).allowed,
    ).toBe(false);
  });

  it("allows ADMIN/SUPER_ADMIN reopen overrides 2->6 and 4->3", () => {
    expect(
      validateInscripcionTransition(
        InscripcionState.RECHAZADO,
        InscripcionState.PENDIENTE_VALIDACION,
        Role.ADMIN,
      ),
    ).toEqual({ allowed: true, isOverride: true });

    expect(
      validateInscripcionTransition(
        InscripcionState.RETIRADO,
        InscripcionState.MATRICULADO,
        Role.SUPER_ADMIN,
      ),
    ).toEqual({ allowed: true, isOverride: true });
  });

  it("rejects same-state and unknown states", () => {
    expect(
      validateInscripcionTransition(
        InscripcionState.MATRICULADO,
        InscripcionState.MATRICULADO,
        Role.ADMIN,
      ).allowed,
    ).toBe(false);

    expect(
      validateInscripcionTransition(InscripcionState.NUEVA, 99, Role.ADMIN).allowed,
    ).toBe(false);
  });
});
