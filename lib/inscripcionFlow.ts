export type InscripcionFlowState =
  | {
      step: "cedula";
      busy: boolean;
      error: string | null;
    }
  | {
      step: "confirmar_nacimiento";
      busy: boolean;
      cedula: string;
      isExistingStudent: boolean;
      error: string | null;
    }
  | {
      step: "metodo";
      busy: boolean;
      isInitiatingBiometria: boolean;
      cedula: string;
      isExistingStudent: boolean;
      error: string | null;
    }
  | {
      step: "form";
      busy: boolean;
      isCheckingEmail: boolean;
      metodoValidacion: "biometrica" | "manual";
      birthDateConfirmed: boolean;
      error: string | null;
    };

export type InscripcionFlowAction =
  | { type: "START_BUSY" }
  | { type: "CEDULA_FOUND"; cedula: string; isExistingStudent: boolean }
  | { type: "BIRTHDATE_VERIFIED"; biometriaEnabled: boolean }
  | { type: "START_BIOMETRIA" }
  | { type: "SELECT_MANUAL" }
  | { type: "BIOMETRIA_RETURN" }
  | { type: "SET_CHECKING_EMAIL"; checking: boolean }
  | { type: "BACK_TO_CEDULA" }
  | { type: "BACK_TO_METODO" }
  | { type: "FAIL"; error: string };

export const INITIAL_INSCRIPCION_FLOW_STATE: InscripcionFlowState = {
  step: "cedula",
  busy: false,
  error: null,
};

export function inscripcionFlowReducer(
  state: InscripcionFlowState,
  action: InscripcionFlowAction,
): InscripcionFlowState {
  switch (action.type) {
    case "START_BUSY":
      if (state.busy) return state;
      return { ...state, busy: true, error: null };

    case "CEDULA_FOUND":
      if (state.step !== "cedula") return state;
      return {
        step: "confirmar_nacimiento",
        busy: false,
        cedula: action.cedula,
        isExistingStudent: action.isExistingStudent,
        error: null,
      };

    case "BIRTHDATE_VERIFIED":
      if (state.step !== "confirmar_nacimiento") return state;
      if (action.biometriaEnabled) {
        return {
          step: "metodo",
          busy: false,
          isInitiatingBiometria: false,
          cedula: state.cedula,
          isExistingStudent: state.isExistingStudent,
          error: null,
        };
      }
      return {
        step: "form",
        busy: false,
        isCheckingEmail: false,
        metodoValidacion: "manual",
        birthDateConfirmed: true,
        error: null,
      };

    case "START_BIOMETRIA":
      if (state.step !== "metodo" || state.busy) return state;
      return {
        ...state,
        busy: true,
        isInitiatingBiometria: true,
        error: null,
      };

    case "SELECT_MANUAL":
      if (state.step !== "metodo") return state;
      return {
        step: "form",
        busy: false,
        isCheckingEmail: false,
        metodoValidacion: "manual",
        birthDateConfirmed: true,
        error: null,
      };

    case "BIOMETRIA_RETURN":
      return {
        step: "form",
        busy: false,
        isCheckingEmail: false,
        metodoValidacion: "biometrica",
        birthDateConfirmed: true,
        error: null,
      };

    case "SET_CHECKING_EMAIL":
      if (state.step !== "form") return state;
      return {
        ...state,
        isCheckingEmail: action.checking,
      };

    case "BACK_TO_CEDULA":
      return {
        step: "cedula",
        busy: false,
        error: null,
      };

    case "BACK_TO_METODO":
      if (state.step === "form") {
        return {
          step: "metodo",
          busy: false,
          isInitiatingBiometria: false,
          cedula: "",
          isExistingStudent: false,
          error: null,
        };
      }
      if (state.step === "confirmar_nacimiento") {
        return {
          step: "metodo",
          busy: false,
          isInitiatingBiometria: false,
          cedula: state.cedula,
          isExistingStudent: state.isExistingStudent,
          error: null,
        };
      }
      return state;

    case "FAIL":
      if (state.step === "metodo") {
        return {
          ...state,
          busy: false,
          isInitiatingBiometria: false,
          error: action.error,
        };
      }
      return {
        ...state,
        busy: false,
        error: action.error,
      };

    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
