import { describe, it, expect } from "vitest";
import { BlogState, Role } from "@/lib/permissions";
import { alcanzables, estadosFinales } from "@/lib/estados/comun";
import {
  ESTADOS_BLOG,
  TRANSICIONES_BLOG,
  motivoNoEditable,
  puedeEditarBlog,
  transicionesBlog,
  validarTransicionBlog,
} from "@/lib/estados/blog";

const { BORRADOR, EN_REVISION_CIEPI, RECHAZADO_CIEPI, EN_REVISION_RP, RECHAZADO_RP, PUBLICADO } = BlogState;
const ROLES: (number | undefined)[] = [Role.ADMIN, Role.SUPER_ADMIN, Role.CIEPI, Role.RELACIONES_PUBLICAS, 99, undefined];
const esAdmin = (rol: number | undefined) => rol === Role.ADMIN || rol === Role.SUPER_ADMIN;
const en = (rol: number | undefined, roles: number[]) => rol !== undefined && roles.includes(rol);

/** Especificación independiente del mapa: ¿se permite de→a para este actor? */
function esperado(de: number, a: number, rol: number | undefined, esAutor: boolean): boolean {
  const autores = [Role.ADMIN, Role.SUPER_ADMIN, Role.CIEPI];
  const revisoresRp = [Role.ADMIN, Role.SUPER_ADMIN, Role.RELACIONES_PUBLICAS];
  switch (`${de}>${a}`) {
    case "1>2": // enviar
    case "3>2": // reenviar tras rechazo CIEPI
    case "5>2": // reenviar tras rechazo RR.PP.
    case "2>1": // retirar
    case "4>1": // retirar
      return en(rol, autores) && (esAutor || esAdmin(rol));
    case "2>4": // aprobar_ciepi
    case "2>3": // rechazar_ciepi
      return en(rol, autores) && !esAutor;
    case "4>6": // publicar
    case "4>5": // rechazar_rp
      return en(rol, revisoresRp) && !esAutor;
    case "6>1": // despublicar
      return en(rol, revisoresRp);
    default:
      return false;
  }
}

describe("estados/blog — matriz estados × estados × roles × autoría", () => {
  for (const de of ESTADOS_BLOG) {
    for (const a of ESTADOS_BLOG) {
      for (const rol of ROLES) {
        for (const esAutor of [true, false]) {
          const exp = esperado(de, a, rol, esAutor);
          it(`${de}→${a} rol=${rol ?? "ninguno"} autor=${esAutor}: ${exp ? "permitido" : "bloqueado"}`, () => {
            const v = validarTransicionBlog(de, a, { rol, esAutor, motivo: "motivo de prueba" });
            expect(v.ok).toBe(exp);
            const ofrecidas = transicionesBlog(de, { rol, esAutor }).map((t) => t.a);
            expect(ofrecidas.includes(a)).toBe(exp);
          });
        }
      }
    }
  }
});

describe("estados/blog — reglas concretas", () => {
  it("nadie aprueba ni publica su propio blog, tampoco un administrador", () => {
    for (const rol of [Role.ADMIN, Role.SUPER_ADMIN, Role.CIEPI]) {
      const v = validarTransicionBlog(EN_REVISION_CIEPI, EN_REVISION_RP, { rol, esAutor: true });
      expect(v).toMatchObject({ ok: false, status: 403 });
    }
    for (const rol of [Role.ADMIN, Role.SUPER_ADMIN]) {
      expect(validarTransicionBlog(EN_REVISION_RP, PUBLICADO, { rol, esAutor: true })).toMatchObject({
        ok: false,
        status: 403,
      });
    }
  });

  it("CIEPI no puede mover blogs ajenos salvo revisar los que están en estado 2", () => {
    const ajeno = { rol: Role.CIEPI, esAutor: false };
    expect(transicionesBlog(BORRADOR, ajeno)).toEqual([]);
    expect(transicionesBlog(RECHAZADO_CIEPI, ajeno)).toEqual([]);
    expect(transicionesBlog(RECHAZADO_RP, ajeno)).toEqual([]);
    expect(transicionesBlog(EN_REVISION_RP, ajeno)).toEqual([]);
    expect(transicionesBlog(PUBLICADO, ajeno)).toEqual([]);
    expect(transicionesBlog(EN_REVISION_CIEPI, ajeno).map((t) => t.accion).sort()).toEqual([
      "aprobar_ciepi",
      "rechazar_ciepi",
    ]);
  });

  it("el autor CIEPI solo envía o retira su blog", () => {
    const autor = { rol: Role.CIEPI, esAutor: true };
    expect(transicionesBlog(BORRADOR, autor).map((t) => t.accion)).toEqual(["enviar"]);
    expect(transicionesBlog(EN_REVISION_CIEPI, autor).map((t) => t.accion)).toEqual(["retirar"]);
    expect(transicionesBlog(EN_REVISION_RP, autor).map((t) => t.accion)).toEqual(["retirar"]);
    expect(transicionesBlog(PUBLICADO, autor)).toEqual([]);
  });

  it("Relaciones Públicas solo revisa el estado 4 y despublica", () => {
    const rp = { rol: Role.RELACIONES_PUBLICAS, esAutor: false };
    expect(transicionesBlog(EN_REVISION_CIEPI, rp)).toEqual([]);
    expect(transicionesBlog(EN_REVISION_RP, rp).map((t) => t.accion).sort()).toEqual(["publicar", "rechazar_rp"]);
    expect(transicionesBlog(PUBLICADO, rp).map((t) => t.accion)).toEqual(["despublicar"]);
  });

  it("rechazar y despublicar exigen motivo; aprobar y enviar no", () => {
    const revisor = { rol: Role.ADMIN, esAutor: false };
    expect(validarTransicionBlog(EN_REVISION_CIEPI, RECHAZADO_CIEPI, revisor)).toMatchObject({ ok: false, status: 400 });
    expect(validarTransicionBlog(EN_REVISION_CIEPI, RECHAZADO_CIEPI, { ...revisor, motivo: "   " })).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(validarTransicionBlog(EN_REVISION_RP, RECHAZADO_RP, revisor)).toMatchObject({ ok: false, status: 400 });
    expect(validarTransicionBlog(PUBLICADO, BORRADOR, revisor)).toMatchObject({ ok: false, status: 400 });
    expect(validarTransicionBlog(EN_REVISION_CIEPI, EN_REVISION_RP, revisor)).toMatchObject({ ok: true });
    expect(validarTransicionBlog(BORRADOR, EN_REVISION_CIEPI, revisor)).toMatchObject({ ok: true });
    const conMotivo = transicionesBlog(EN_REVISION_CIEPI, revisor).find((t) => t.accion === "rechazar_ciepi");
    expect(conMotivo?.requiereMotivo).toBe(true);
  });

  it("no se pueden saltar etapas ni usar estados inválidos", () => {
    const admin = { rol: Role.ADMIN, esAutor: false, motivo: "x" };
    expect(validarTransicionBlog(BORRADOR, PUBLICADO, admin)).toMatchObject({ ok: false, status: 400 });
    expect(validarTransicionBlog(BORRADOR, EN_REVISION_RP, admin)).toMatchObject({ ok: false, status: 400 });
    expect(validarTransicionBlog(BORRADOR, BORRADOR, admin)).toMatchObject({ ok: false, status: 400 });
    expect(validarTransicionBlog(BORRADOR, 99, admin)).toMatchObject({ ok: false, status: 400 });
    expect(validarTransicionBlog(0, BORRADOR, admin)).toMatchObject({ ok: false, status: 400 });
    expect(transicionesBlog(99, admin)).toEqual([]);
  });

  it("acciones en el historial", () => {
    const admin = { rol: Role.ADMIN, esAutor: false, motivo: "x" };
    const accion = (de: number, a: number) => {
      const v = validarTransicionBlog(de, a, admin);
      return v.ok ? v.transicion.accion : null;
    };
    expect(accion(BORRADOR, EN_REVISION_CIEPI)).toBe("enviar");
    expect(accion(RECHAZADO_CIEPI, EN_REVISION_CIEPI)).toBe("enviar");
    expect(accion(RECHAZADO_RP, EN_REVISION_CIEPI)).toBe("enviar");
    expect(accion(EN_REVISION_CIEPI, EN_REVISION_RP)).toBe("aprobar_ciepi");
    expect(accion(EN_REVISION_CIEPI, RECHAZADO_CIEPI)).toBe("rechazar_ciepi");
    expect(accion(EN_REVISION_RP, PUBLICADO)).toBe("publicar");
    expect(accion(EN_REVISION_RP, RECHAZADO_RP)).toBe("rechazar_rp");
    expect(accion(PUBLICADO, BORRADOR)).toBe("despublicar");
  });
});

describe("estados/blog — edición de contenido", () => {
  const editables = [BORRADOR, RECHAZADO_CIEPI, RECHAZADO_RP];

  for (const estado of ESTADOS_BLOG) {
    for (const rol of ROLES) {
      for (const esAutor of [true, false]) {
        const exp =
          editables.includes(estado) && en(rol, [Role.ADMIN, Role.SUPER_ADMIN, Role.CIEPI]) && (esAutor || esAdmin(rol));
        it(`estado ${estado} rol=${rol ?? "ninguno"} autor=${esAutor}: ${exp ? "editable" : "no editable"}`, () => {
          expect(puedeEditarBlog(estado, { rol, esAutor })).toBe(exp);
          expect(motivoNoEditable(estado, { rol, esAutor }) === null).toBe(exp);
        });
      }
    }
  }

  it("ni el autor ni un administrador editan un blog en revisión o publicado", () => {
    for (const estado of [EN_REVISION_CIEPI, EN_REVISION_RP, PUBLICADO]) {
      expect(puedeEditarBlog(estado, { rol: Role.CIEPI, esAutor: true })).toBe(false);
      expect(puedeEditarBlog(estado, { rol: Role.ADMIN, esAutor: true })).toBe(false);
      expect(puedeEditarBlog(estado, { rol: Role.SUPER_ADMIN, esAutor: false })).toBe(false);
    }
    expect(motivoNoEditable(PUBLICADO, { rol: Role.ADMIN, esAutor: false })).toMatch(/Despublícalo/);
    expect(motivoNoEditable(EN_REVISION_RP, { rol: Role.CIEPI, esAutor: true })).toMatch(/Retíralo/);
  });

  it("CIEPI no edita blogs ajenos y RR.PP. no edita ninguno", () => {
    expect(puedeEditarBlog(BORRADOR, { rol: Role.CIEPI, esAutor: false })).toBe(false);
    expect(puedeEditarBlog(BORRADOR, { rol: Role.RELACIONES_PUBLICAS, esAutor: true })).toBe(false);
  });
});

describe("estados/blog — estructura del grafo", () => {
  it("todos los estados tienen salida (no hay finales ni overrides)", () => {
    expect(estadosFinales(TRANSICIONES_BLOG)).toEqual([]);
    for (const e of ESTADOS_BLOG) {
      expect(TRANSICIONES_BLOG[e].length).toBeGreaterThan(0);
      expect(TRANSICIONES_BLOG[e].every((t) => !t.override)).toBe(true);
    }
  });

  it("todos los estados son alcanzables desde Borrador", () => {
    expect([...alcanzables(TRANSICIONES_BLOG, BORRADOR)].sort()).toEqual([...ESTADOS_BLOG].sort());
  });

  it("cada transición lleva a un estado conocido y no hay dos al mismo destino", () => {
    for (const e of ESTADOS_BLOG) {
      const destinos = TRANSICIONES_BLOG[e].map((t) => t.a);
      expect(new Set(destinos).size).toBe(destinos.length);
      for (const d of destinos) expect(ESTADOS_BLOG).toContain(d);
    }
  });

  it("Publicado se alcanza solo pasando por las dos revisiones", () => {
    for (const e of ESTADOS_BLOG) {
      const llegaAPublicado = TRANSICIONES_BLOG[e].some((t) => t.a === PUBLICADO);
      expect(llegaAPublicado).toBe(e === EN_REVISION_RP);
      const llegaARevisionRp = TRANSICIONES_BLOG[e].some((t) => t.a === EN_REVISION_RP);
      expect(llegaARevisionRp).toBe(e === EN_REVISION_CIEPI);
    }
  });
});
