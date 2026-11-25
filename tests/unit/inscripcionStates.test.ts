import { describe, it, expect } from "vitest";
import { Role } from "@/lib/permissions";
import { alcanzables, estadosFinales } from "@/lib/estados/comun";
import {
  ALL_INSCRIPCION_STATES,
  InscripcionState as S,
  TRANSICIONES_INSCRIPCION,
  getNextInscripcionStates,
  isValidInscripcionState,
  puedeGestionarInscripciones,
  transicionesInscripcion,
  validarTransicionInscripcion,
} from "@/lib/inscripcionStates";

const ROLES = [Role.ADMIN, Role.SUPER_ADMIN, Role.CIEPI, Role.RELACIONES_PUBLICAS] as const;
const GESTION = [Role.ADMIN, Role.SUPER_ADMIN, Role.CIEPI];
const OVERRIDE = [Role.ADMIN, Role.SUPER_ADMIN];

/** Transiciones normales esperadas (de → destinos). */
const NORMALES: Record<S, S[]> = {
  [S.NUEVA]: [S.PENDIENTE_VALIDACION, S.MATRICULADO, S.RECHAZADO],
  [S.PENDIENTE_VALIDACION]: [S.MATRICULADO, S.RECHAZADO, S.NUEVA],
  [S.MATRICULADO]: [S.TERMINO_CURSO, S.RETIRADO],
  [S.RECHAZADO]: [],
  [S.RETIRADO]: [],
  [S.TERMINO_CURSO]: [],
};
/** Overrides esperados (solo Admin / Super Admin). */
const OVERRIDES: Record<S, S[]> = {
  [S.NUEVA]: [],
  [S.PENDIENTE_VALIDACION]: [],
  [S.MATRICULADO]: [],
  [S.RECHAZADO]: [S.PENDIENTE_VALIDACION],
  [S.RETIRADO]: [S.MATRICULADO],
  [S.TERMINO_CURSO]: [S.MATRICULADO],
};
/** Pares que exigen motivo. */
const CON_MOTIVO = new Set([
  `${S.NUEVA}>${S.RECHAZADO}`,
  `${S.PENDIENTE_VALIDACION}>${S.RECHAZADO}`,
  `${S.MATRICULADO}>${S.RETIRADO}`,
  `${S.RECHAZADO}>${S.PENDIENTE_VALIDACION}`,
  `${S.RETIRADO}>${S.MATRICULADO}`,
  `${S.TERMINO_CURSO}>${S.MATRICULADO}`,
]);

function esperado(de: S, a: S, rol: number): { ok: boolean; status?: number } {
  if (de === a) return { ok: false, status: 400 };
  const normal = NORMALES[de].includes(a);
  const override = OVERRIDES[de].includes(a);
  if (!normal && !override) return { ok: false, status: 400 };
  const roles = override ? OVERRIDE : GESTION;
  if (!roles.includes(rol)) return { ok: false, status: 403 };
  return { ok: true };
}

describe("máquina de inscripciones: matriz completa 6×6×roles", () => {
  for (const de of ALL_INSCRIPCION_STATES) {
    for (const a of ALL_INSCRIPCION_STATES) {
      for (const rol of ROLES) {
        const exp = esperado(de, a, rol);
        it(`${de} → ${a} con rol ${rol}: ${exp.ok ? "permitido" : `bloqueado (${exp.status})`}`, () => {
          const r = validarTransicionInscripcion(de, a, { rol, motivo: "motivo de prueba" });
          expect(r.ok).toBe(exp.ok);
          if (!r.ok) expect(r.status).toBe(exp.status);
          else {
            expect(r.transicion.a).toBe(a);
            expect(r.transicion.override).toBe(OVERRIDES[de].includes(a));
          }

          // La lista que ve la UI coincide con la validación del servidor.
          const ofrecidas = transicionesInscripcion(de, rol).map((t) => t.a);
          expect(ofrecidas.includes(a)).toBe(exp.ok);
        });
      }
    }
  }
});

describe("estructura del mapa", () => {
  it("coincide exactamente con la tabla esperada", () => {
    for (const de of ALL_INSCRIPCION_STATES) {
      const destinos = TRANSICIONES_INSCRIPCION[de].map((t) => t.a).sort();
      expect(destinos).toEqual([...NORMALES[de], ...OVERRIDES[de]].sort());
      expect(getNextInscripcionStates(de).sort()).toEqual([...NORMALES[de]].sort());
    }
  });

  it("solo 2, 4 y 5 son finales; todo estado no final tiene salida normal", () => {
    expect(estadosFinales(TRANSICIONES_INSCRIPCION).map(Number).sort()).toEqual([
      S.RECHAZADO,
      S.RETIRADO,
      S.TERMINO_CURSO,
    ]);
    for (const de of ALL_INSCRIPCION_STATES) {
      const finales = estadosFinales(TRANSICIONES_INSCRIPCION).map(Number);
      if (!finales.includes(de)) {
        expect(TRANSICIONES_INSCRIPCION[de].some((t) => !t.override)).toBe(true);
      }
    }
  });

  it("todos los estados son alcanzables desde Nueva", () => {
    const desdeNueva = [...alcanzables(TRANSICIONES_INSCRIPCION, S.NUEVA)].map(Number).sort();
    expect(desdeNueva).toEqual([...ALL_INSCRIPCION_STATES].sort());
  });

  it("los overrides solo los ejecutan Admin y Super Admin", () => {
    for (const de of ALL_INSCRIPCION_STATES) {
      for (const t of TRANSICIONES_INSCRIPCION[de]) {
        if (t.override) {
          expect([...(t.roles ?? [])].sort()).toEqual([...OVERRIDE].sort());
        } else {
          expect([...(t.roles ?? [])].sort()).toEqual([...GESTION].sort());
        }
      }
    }
  });

  it("todas las transiciones tienen acción y etiqueta", () => {
    for (const de of ALL_INSCRIPCION_STATES) {
      for (const t of TRANSICIONES_INSCRIPCION[de]) {
        expect(t.accion).toMatch(/^[a-z_]+$/);
        expect(t.accion.length).toBeLessThanOrEqual(40);
        expect(t.etiqueta.trim()).not.toBe("");
      }
    }
  });
});

describe("motivo obligatorio", () => {
  it("rechazar, retirar y los overrides exigen motivo; el resto no", () => {
    for (const de of ALL_INSCRIPCION_STATES) {
      for (const t of TRANSICIONES_INSCRIPCION[de]) {
        expect(Boolean(t.requiereMotivo)).toBe(CON_MOTIVO.has(`${de}>${t.a}`));
      }
    }
  });

  it("sin motivo (o en blanco) responde 400; con motivo pasa", () => {
    for (const par of CON_MOTIVO) {
      const [de, a] = par.split(">").map(Number);
      expect(validarTransicionInscripcion(de, a, { rol: Role.ADMIN })).toMatchObject({ ok: false, status: 400 });
      expect(validarTransicionInscripcion(de, a, { rol: Role.ADMIN, motivo: "   " })).toMatchObject({
        ok: false,
        status: 400,
      });
      expect(validarTransicionInscripcion(de, a, { rol: Role.ADMIN, motivo: "Documentos incompletos" }).ok).toBe(true);
    }
  });

  it("matricular no necesita motivo", () => {
    expect(validarTransicionInscripcion(S.NUEVA, S.MATRICULADO, { rol: Role.CIEPI }).ok).toBe(true);
  });

  it("la UI recibe requiereMotivo y override", () => {
    const desdeRetirado = transicionesInscripcion(S.RETIRADO, Role.SUPER_ADMIN);
    expect(desdeRetirado).toEqual([
      expect.objectContaining({ a: S.MATRICULADO, requiereMotivo: true, override: true }),
    ]);
  });
});

describe("roles y valores inválidos", () => {
  it("Relaciones Públicas y roles desconocidos no reciben transiciones", () => {
    expect(puedeGestionarInscripciones(Role.RELACIONES_PUBLICAS)).toBe(false);
    expect(puedeGestionarInscripciones(undefined)).toBe(false);
    expect(puedeGestionarInscripciones(null)).toBe(false);
    for (const de of ALL_INSCRIPCION_STATES) {
      expect(transicionesInscripcion(de, Role.RELACIONES_PUBLICAS)).toEqual([]);
      expect(transicionesInscripcion(de, undefined)).toEqual([]);
      expect(transicionesInscripcion(de, 99)).toEqual([]);
    }
  });

  it("CIEPI no ve los overrides desde estados finales", () => {
    expect(transicionesInscripcion(S.RECHAZADO, Role.CIEPI)).toEqual([]);
    expect(transicionesInscripcion(S.RETIRADO, Role.CIEPI)).toEqual([]);
    expect(transicionesInscripcion(S.TERMINO_CURSO, Role.CIEPI)).toEqual([]);
  });

  it("estados fuera de 1..6 son inválidos", () => {
    expect(isValidInscripcionState(0)).toBe(false);
    expect(isValidInscripcionState(7)).toBe(false);
    expect(validarTransicionInscripcion(S.NUEVA, 99, { rol: Role.ADMIN })).toMatchObject({ ok: false, status: 400 });
    expect(validarTransicionInscripcion(7, S.NUEVA, { rol: Role.ADMIN })).toMatchObject({ ok: false, status: 400 });
    expect(transicionesInscripcion(7, Role.ADMIN)).toEqual([]);
  });
});
