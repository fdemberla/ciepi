import { describe, it, expect } from "vitest";
import {
  ESPERA_REENVIO_SEGUNDOS,
  MAX_REENVIOS,
  estadoEfectivo,
  validarCanje,
  validarReenvio,
  type EstadoVerificacionGuardado,
} from "@/lib/estados/verificacionCorreo";
import {
  ESTADOS_SESION,
  MAX_INTENTOS_FECHA_SESION,
  normalizarCedula,
  puedeTransicionarSesion,
  trasFalloFecha,
  type EstadoSesion,
} from "@/lib/estados/inscripcionSesion";

const AHORA = new Date("2026-11-25T15:00:00Z");
const futuro = new Date(AHORA.getTime() + 10 * 60_000);
const pasado = new Date(AHORA.getTime() - 60_000);

describe("máquina de verificación de correo", () => {
  it("expirado es derivado solo para pendientes", () => {
    expect(estadoEfectivo({ estado: "pendiente", fecha_expiracion: futuro }, AHORA)).toBe("pendiente");
    expect(estadoEfectivo({ estado: "pendiente", fecha_expiracion: pasado }, AHORA)).toBe("expirado");
    expect(estadoEfectivo({ estado: "verificado", fecha_expiracion: pasado }, AHORA)).toBe("verificado");
    expect(estadoEfectivo({ estado: "invalidado", fecha_expiracion: futuro }, AHORA)).toBe("invalidado");
  });

  it("solo un enlace pendiente y vigente se puede canjear; invalidado ≠ verificado", () => {
    const casos: Array<[EstadoVerificacionGuardado, Date, string | true]> = [
      ["pendiente", futuro, true],
      ["pendiente", pasado, "TOKEN_EXPIRED"],
      ["verificado", futuro, "TOKEN_ALREADY_USED"],
      ["invalidado", futuro, "TOKEN_INVALIDATED"],
    ];
    for (const [estado, fecha_expiracion, esperado] of casos) {
      const r = validarCanje({ estado, fecha_expiracion }, AHORA);
      expect(r.permitido ? true : r.codigo).toBe(esperado);
    }
  });

  it("reenvío: límites de estado, cantidad y espera", () => {
    const base = { estado: "pendiente" as const, fecha_expiracion: pasado, reenvios: 0 };
    const hace = (s: number) => new Date(AHORA.getTime() - s * 1000);

    expect(validarReenvio({ ...base, fecha_creacion: hace(ESPERA_REENVIO_SEGUNDOS + 1) }, AHORA).permitido).toBe(true);
    const pronto = validarReenvio({ ...base, fecha_creacion: hace(10) }, AHORA);
    expect(pronto).toMatchObject({ permitido: false, status: 429, esperarSegundos: ESPERA_REENVIO_SEGUNDOS - 10 });
    expect(
      validarReenvio({ ...base, reenvios: MAX_REENVIOS, fecha_creacion: hace(999) }, AHORA)
    ).toMatchObject({ permitido: false, status: 429 });
    expect(validarReenvio({ ...base, estado: "verificado", fecha_creacion: hace(999) }, AHORA)).toMatchObject({
      permitido: false,
      status: 409,
    });
    expect(validarReenvio({ ...base, estado: "invalidado", fecha_creacion: hace(999) }, AHORA)).toMatchObject({
      permitido: false,
      status: 410,
    });
  });
});

describe("máquina de sesión de inscripción", () => {
  it("matriz completa de transiciones", () => {
    const permitidas = new Set([
      "cedula_verificada>identidad_verificada",
      "cedula_verificada>bloqueada",
      "identidad_verificada>usada",
    ]);
    for (const desde of ESTADOS_SESION) {
      for (const hacia of ESTADOS_SESION) {
        expect(puedeTransicionarSesion(desde as EstadoSesion, hacia as EstadoSesion)).toBe(
          permitidas.has(`${desde}>${hacia}`)
        );
      }
    }
  });

  it("se bloquea al llegar al máximo de intentos de fecha", () => {
    let intentos = 0;
    let estado: EstadoSesion = "cedula_verificada";
    for (let i = 0; i < MAX_INTENTOS_FECHA_SESION; i++) {
      ({ intentos, estado } = trasFalloFecha(intentos));
      expect(estado).toBe(i === MAX_INTENTOS_FECHA_SESION - 1 ? "bloqueada" : "cedula_verificada");
    }
    expect(intentos).toBe(MAX_INTENTOS_FECHA_SESION);
  });

  it("normaliza cédulas para comparar con la respuesta del Hub", () => {
    expect(normalizarCedula(" 8-123-456 ")).toBe("8-123-456");
    expect(normalizarCedula("pe-1-2")).toBe("PE-1-2");
    expect(normalizarCedula(null)).toBe("");
  });
});
