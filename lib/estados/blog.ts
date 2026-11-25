/**
 * Máquina de estados del blog (ciepi.blogs.estado, entero 1-6).
 *
 *   1 Borrador ──enviar──▶ 2 En revisión CIEPI ──aprobar_ciepi──▶ 4 En revisión RR.PP. ──publicar──▶ 6 Publicado
 *                           │  ▲                                    │                                 │
 *             rechazar_ciepi│  │enviar                   rechazar_rp│                     despublicar │
 *                           ▼  │                                    ▼                                 ▼
 *                     3 Rechazado CIEPI                       5 Rechazado RR.PP. ──enviar──▶ 2     1 Borrador
 *
 *   2 y 4 ──retirar──▶ 1 (el autor o un admin lo saca de revisión para corregirlo).
 *
 * Reglas:
 * - Enviar / retirar: solo el autor o un administrador (ADMIN o SUPER_ADMIN). Un usuario
 *   CIEPI no puede mover blogs ajenos salvo para revisar los que están en estado 2.
 * - Revisión CIEPI (2→4, 2→3): rol CIEPI o administrador. Revisión RR.PP. (4→6, 4→5):
 *   rol Relaciones Públicas o administrador.
 * - Separación de funciones: quien revisa (aprobar, rechazar, publicar) no puede ser el
 *   autor, tampoco si es administrador. Decisión deliberada: no hay excepción para
 *   ningún rol; un administrador que escribe un blog necesita que otra persona lo revise.
 * - Rechazar y despublicar exigen motivo (queda en ciepi.estado_historial).
 * - Despublicar (6→1): administradores o Relaciones Públicas. El blog vuelve a Borrador
 *   y debe pasar otra vez por las dos revisiones.
 * - No hay overrides: todos los estados tienen salida por el flujo normal.
 *
 * Edición de contenido (título, contenido, imagen, palabras clave) es una regla aparte:
 * solo el autor o un administrador, y solo en Borrador o Rechazado (1, 3, 5). En revisión
 * (2, 4) hay que retirarlo primero; publicado (6) hay que despublicarlo primero, para que
 * ningún texto llegue al público sin pasar por CIEPI y RR.PP.
 */

import { BlogState, Role } from "@/lib/permissions";
import {
  transicionesPermitidas,
  validarTransicion,
  type ContextoTransicion,
  type MapaTransiciones,
  type TransicionDisponible,
} from "@/lib/estados/comun";

export type EstadoBlog = BlogState;

export const ESTADOS_BLOG: readonly EstadoBlog[] = [
  BlogState.BORRADOR,
  BlogState.EN_REVISION_CIEPI,
  BlogState.RECHAZADO_CIEPI,
  BlogState.EN_REVISION_RP,
  BlogState.RECHAZADO_RP,
  BlogState.PUBLICADO,
];

export const ETIQUETA_ESTADO_BLOG: Record<EstadoBlog, string> = {
  [BlogState.BORRADOR]: "Borrador",
  [BlogState.EN_REVISION_CIEPI]: "En Revisión CIEPI",
  [BlogState.RECHAZADO_CIEPI]: "Rechazado por CIEPI",
  [BlogState.EN_REVISION_RP]: "En Revisión Relaciones Públicas",
  [BlogState.RECHAZADO_RP]: "Rechazado por Relaciones Públicas",
  [BlogState.PUBLICADO]: "Publicado",
};

/** Estados en los que se puede editar el contenido. */
export const ESTADOS_EDITABLES_BLOG: readonly EstadoBlog[] = [
  BlogState.BORRADOR,
  BlogState.RECHAZADO_CIEPI,
  BlogState.RECHAZADO_RP,
];

export interface ContextoBlog extends ContextoTransicion {
  rol?: number;
  /** El actor es quien creó el blog (creado_por = adminId). */
  esAutor: boolean;
}

const ADMINS = [Role.ADMIN, Role.SUPER_ADMIN] as const;
const AUTORES = [Role.CIEPI, ...ADMINS] as const;
const REVISORES_CIEPI = [Role.CIEPI, ...ADMINS] as const;
const REVISORES_RP = [Role.RELACIONES_PUBLICAS, ...ADMINS] as const;

export function esAdminBlog(rol: number | undefined): boolean {
  return rol === Role.ADMIN || rol === Role.SUPER_ADMIN;
}

/** Enviar o retirar: solo el autor o un administrador. */
const soloAutorOAdmin = (ctx: ContextoBlog): string | null =>
  ctx.esAutor || esAdminBlog(ctx.rol) ? null : "Solo el autor o un administrador puede hacer este cambio.";

/** Revisar: nunca el propio autor (separación de funciones, sin excepción de rol). */
const revisorDistintoDelAutor = (ctx: ContextoBlog): string | null =>
  ctx.esAutor ? "No puedes revisar ni aprobar un blog que escribiste tú. Debe hacerlo otra persona." : null;

const ENVIAR = {
  a: BlogState.EN_REVISION_CIEPI,
  accion: "enviar",
  etiqueta: "Enviar a revisión CIEPI",
  roles: AUTORES,
  guarda: soloAutorOAdmin,
} as const;

const RETIRAR = {
  a: BlogState.BORRADOR,
  accion: "retirar",
  etiqueta: "Retirar de revisión (volver a borrador)",
  roles: AUTORES,
  guarda: soloAutorOAdmin,
} as const;

export const TRANSICIONES_BLOG: MapaTransiciones<EstadoBlog, ContextoBlog> = {
  [BlogState.BORRADOR]: [ENVIAR],
  [BlogState.EN_REVISION_CIEPI]: [
    {
      a: BlogState.EN_REVISION_RP,
      accion: "aprobar_ciepi",
      etiqueta: "Aprobar y enviar a RR.PP.",
      roles: REVISORES_CIEPI,
      guarda: revisorDistintoDelAutor,
    },
    {
      a: BlogState.RECHAZADO_CIEPI,
      accion: "rechazar_ciepi",
      etiqueta: "Rechazar (CIEPI)",
      roles: REVISORES_CIEPI,
      requiereMotivo: true,
      guarda: revisorDistintoDelAutor,
    },
    RETIRAR,
  ],
  [BlogState.RECHAZADO_CIEPI]: [{ ...ENVIAR, etiqueta: "Reenviar a revisión CIEPI" }],
  [BlogState.EN_REVISION_RP]: [
    {
      a: BlogState.PUBLICADO,
      accion: "publicar",
      etiqueta: "Aprobar y publicar",
      roles: REVISORES_RP,
      guarda: revisorDistintoDelAutor,
    },
    {
      a: BlogState.RECHAZADO_RP,
      accion: "rechazar_rp",
      etiqueta: "Rechazar (RR.PP.)",
      roles: REVISORES_RP,
      requiereMotivo: true,
      guarda: revisorDistintoDelAutor,
    },
    RETIRAR,
  ],
  [BlogState.RECHAZADO_RP]: [{ ...ENVIAR, etiqueta: "Reenviar a revisión CIEPI" }],
  [BlogState.PUBLICADO]: [
    {
      a: BlogState.BORRADOR,
      accion: "despublicar",
      etiqueta: "Despublicar (volver a borrador)",
      roles: REVISORES_RP,
      requiereMotivo: true,
    },
  ],
};

export function esEstadoBlog(valor: unknown): valor is EstadoBlog {
  return typeof valor === "number" && ESTADOS_BLOG.includes(valor as EstadoBlog);
}

/** Transiciones que el actor puede ejecutar sobre un blog (para la API y la UI). */
export function transicionesBlog(estado: number, ctx: ContextoBlog): TransicionDisponible<EstadoBlog>[] {
  if (!esEstadoBlog(estado)) return [];
  return transicionesPermitidas(TRANSICIONES_BLOG, estado, ctx);
}

/** Valida un cambio de estado concreto (servidor). */
export function validarTransicionBlog(
  de: number,
  a: number,
  ctx: ContextoBlog & { motivo?: string | null }
) {
  return validarTransicion(TRANSICIONES_BLOG, de as EstadoBlog, a as EstadoBlog, ctx);
}

/**
 * ¿Puede el actor editar el contenido del blog? Devuelve null si puede, o el motivo.
 * Autor o administrador, solo en Borrador / Rechazado.
 */
export function motivoNoEditable(estado: number, ctx: ContextoBlog): string | null {
  if (!(AUTORES as readonly number[]).includes(ctx.rol ?? -1)) {
    return "Tu rol no permite editar el contenido de los blogs.";
  }
  if (!ctx.esAutor && !esAdminBlog(ctx.rol)) {
    return "Solo el autor o un administrador puede editar este blog.";
  }
  if (!ESTADOS_EDITABLES_BLOG.includes(estado as EstadoBlog)) {
    if (estado === BlogState.PUBLICADO) {
      return "Un blog publicado no se puede editar. Despublícalo primero; volverá a Borrador y deberá pasar de nuevo por revisión.";
    }
    return "El blog está en revisión y no se puede editar. Retíralo de revisión (vuelve a Borrador) para hacer cambios.";
  }
  return null;
}

export function puedeEditarBlog(estado: number, ctx: ContextoBlog): boolean {
  return motivoNoEditable(estado, ctx) === null;
}
