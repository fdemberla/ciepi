/**
 * Piezas comunes de las máquinas de estado (módulos puros, sin base de datos).
 *
 * Cada máquina declara un mapa TRANSICIONES: estado → lista de transiciones posibles.
 * Una transición tiene destino, acción (verbo para la UI y el historial), roles que
 * pueden ejecutarla, si exige motivo, si es un "override" de administrador y una
 * guarda opcional con reglas de contexto (p. ej. revisor distinto del autor).
 *
 * La API devuelve `transicionesPermitidas(...)` por fila y la interfaz solo dibuja
 * esos botones; el servidor vuelve a validar con `validarTransicion(...)`.
 */

export interface ContextoTransicion {
  /** Rol del actor (lib/permissions.ts Role). undefined = sistema / ciudadano. */
  rol?: number;
  [clave: string]: unknown;
}

export interface Transicion<E extends string | number, C extends ContextoTransicion = ContextoTransicion> {
  a: E;
  accion: string;
  /** Etiqueta para el botón. */
  etiqueta: string;
  /** Roles que pueden ejecutarla; omitido = cualquier rol administrativo. */
  roles?: readonly number[];
  requiereMotivo?: boolean;
  /** Reabrir un estado final; queda marcado en el historial. */
  override?: boolean;
  /** Regla extra; devuelve un mensaje si NO se permite. */
  guarda?: (ctx: C) => string | null;
}

export type MapaTransiciones<E extends string | number, C extends ContextoTransicion = ContextoTransicion> = Record<
  E,
  readonly Transicion<E, C>[]
>;

export interface TransicionDisponible<E> {
  a: E;
  accion: string;
  etiqueta: string;
  requiereMotivo: boolean;
  override: boolean;
}

function rolPermitido(t: { roles?: readonly number[] }, rol: number | undefined): boolean {
  return !t.roles || (rol !== undefined && t.roles.includes(rol));
}

/** Transiciones que el actor puede ejecutar desde `estado` (para la API y la UI). */
export function transicionesPermitidas<E extends string | number, C extends ContextoTransicion>(
  mapa: MapaTransiciones<E, C>,
  estado: E,
  ctx: C
): TransicionDisponible<E>[] {
  return (mapa[estado] ?? [])
    .filter((t) => rolPermitido(t, ctx.rol) && !(t.guarda && t.guarda(ctx)))
    .map((t) => ({
      a: t.a,
      accion: t.accion,
      etiqueta: t.etiqueta,
      requiereMotivo: Boolean(t.requiereMotivo),
      override: Boolean(t.override),
    }));
}

export type ResultadoTransicion<E> =
  | { ok: true; transicion: TransicionDisponible<E> }
  | { ok: false; status: number; motivo: string };

/** Valida un cambio de estado concreto (servidor). */
export function validarTransicion<E extends string | number, C extends ContextoTransicion>(
  mapa: MapaTransiciones<E, C>,
  de: E,
  a: E,
  ctx: C & { motivo?: string | null }
): ResultadoTransicion<E> {
  if (!(de in mapa) || !(a in mapa)) {
    return { ok: false, status: 400, motivo: "Estado inválido." };
  }
  if (de === a) {
    return { ok: false, status: 400, motivo: "Ya se encuentra en ese estado." };
  }
  const t = (mapa[de] ?? []).find((x) => x.a === a);
  if (!t) {
    return { ok: false, status: 400, motivo: `Cambio de estado no permitido (${de} → ${a}).` };
  }
  if (!rolPermitido(t, ctx.rol)) {
    return { ok: false, status: 403, motivo: "Tu rol no puede realizar este cambio de estado." };
  }
  const bloqueo = t.guarda?.(ctx);
  if (bloqueo) return { ok: false, status: 403, motivo: bloqueo };
  if (t.requiereMotivo && !(ctx.motivo && String(ctx.motivo).trim())) {
    return { ok: false, status: 400, motivo: "Este cambio requiere un motivo." };
  }
  return {
    ok: true,
    transicion: {
      a: t.a,
      accion: t.accion,
      etiqueta: t.etiqueta,
      requiereMotivo: Boolean(t.requiereMotivo),
      override: Boolean(t.override),
    },
  };
}

/** Estados sin transiciones de salida (finales). Útil en tests. */
export function estadosFinales<E extends string | number, C extends ContextoTransicion>(
  mapa: MapaTransiciones<E, C>
): E[] {
  return (Object.keys(mapa) as unknown as E[]).filter((e) => (mapa[e] ?? []).every((t) => t.override));
}

/** Estados alcanzables desde `inicial` (sin overrides). Útil en tests. */
export function alcanzables<E extends string | number, C extends ContextoTransicion>(
  mapa: MapaTransiciones<E, C>,
  inicial: E
): Set<E> {
  const vistos = new Set<E>([inicial]);
  const pila = [inicial];
  while (pila.length) {
    const e = pila.pop() as E;
    for (const t of mapa[e] ?? []) {
      if (!vistos.has(t.a)) {
        vistos.add(t.a);
        pila.push(t.a);
      }
    }
  }
  return vistos;
}
