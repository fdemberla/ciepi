import { describe, it, expect } from "vitest";
import {
  INITIAL_INSCRIPCION_FLOW_STATE,
  inscripcionFlowReducer,
} from "@/lib/inscripcionFlow";

describe("inscripcionFlowReducer", () => {
  it("transitions cedula -> confirmar_nacimiento -> form when biometria is disabled", () => {
    let state = INITIAL_INSCRIPCION_FLOW_STATE;
    state = inscripcionFlowReducer(state, { type: "START_BUSY" });
    expect(state.busy).toBe(true);

    state = inscripcionFlowReducer(state, {
      type: "CEDULA_FOUND",
      cedula: "8-123-4567",
      isExistingStudent: false,
    });
    expect(state.step).toBe("confirmar_nacimiento");
    expect(state.busy).toBe(false);

    state = inscripcionFlowReducer(state, {
      type: "BIRTHDATE_VERIFIED",
      biometriaEnabled: false,
    });
    expect(state.step).toBe("form");
    if (state.step === "form") {
      expect(state.metodoValidacion).toBe("manual");
      expect(state.birthDateConfirmed).toBe(true);
      expect(state.isCheckingEmail).toBe(false);
    }
  });

  it("transitions confirmar_nacimiento -> metodo -> form when biometria is enabled", () => {
    let state = inscripcionFlowReducer(INITIAL_INSCRIPCION_FLOW_STATE, {
      type: "CEDULA_FOUND",
      cedula: "8-123-4567",
      isExistingStudent: true,
    });
    state = inscripcionFlowReducer(state, {
      type: "BIRTHDATE_VERIFIED",
      biometriaEnabled: true,
    });
    expect(state.step).toBe("metodo");

    state = inscripcionFlowReducer(state, { type: "START_BIOMETRIA" });
    if (state.step === "metodo") {
      expect(state.isInitiatingBiometria).toBe(true);
      expect(state.busy).toBe(true);
    }

    state = inscripcionFlowReducer(state, { type: "FAIL", error: "Timeout" });
    if (state.step === "metodo") {
      expect(state.isInitiatingBiometria).toBe(false);
      expect(state.busy).toBe(false);
      expect(state.error).toBe("Timeout");
    }

    state = inscripcionFlowReducer(state, { type: "SELECT_MANUAL" });
    expect(state.step).toBe("form");
  });

  it("ignores invalid transitions from wrong steps and prevents double START_BUSY", () => {
    const afterSelectManual = inscripcionFlowReducer(
      INITIAL_INSCRIPCION_FLOW_STATE,
      { type: "SELECT_MANUAL" },
    );
    expect(afterSelectManual).toEqual(INITIAL_INSCRIPCION_FLOW_STATE);

    const busyState = inscripcionFlowReducer(INITIAL_INSCRIPCION_FLOW_STATE, {
      type: "START_BUSY",
    });
    const doubleBusy = inscripcionFlowReducer(busyState, {
      type: "START_BUSY",
    });
    expect(doubleBusy).toBe(busyState);
  });

  it("updates isCheckingEmail only in form step", () => {
    const ignored = inscripcionFlowReducer(INITIAL_INSCRIPCION_FLOW_STATE, {
      type: "SET_CHECKING_EMAIL",
      checking: true,
    });
    expect(ignored).toEqual(INITIAL_INSCRIPCION_FLOW_STATE);

    const formState = inscripcionFlowReducer(INITIAL_INSCRIPCION_FLOW_STATE, {
      type: "BIOMETRIA_RETURN",
    });
    const checking = inscripcionFlowReducer(formState, {
      type: "SET_CHECKING_EMAIL",
      checking: true,
    });
    if (checking.step === "form") {
      expect(checking.isCheckingEmail).toBe(true);
    }
  });
});
