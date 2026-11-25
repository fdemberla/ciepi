import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import { Role } from "@/lib/permissions";

/**
 * Verifica que la petición venga de un administrador. Devuelve la respuesta
 * 401 lista para retornar, o null si está autorizado.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.isAdmin) {
    return NextResponse.json(
      { success: false, error: "No autorizado. Se requieren permisos de administrador." },
      { status: 401 }
    );
  }
  return null;
}

/** Entero positivo de un parámetro de ruta, o null. */
export function parseId(value: string): number | null {
  return /^\d{1,9}$/.test(value) ? Number(value) : null;
}

/**
 * Áreas de la API de administración y roles que pueden MODIFICARLAS (POST/PUT/PATCH/DELETE).
 * La lectura (GET) basta con requireAdmin. Las máquinas de estado aplican además sus
 * propias reglas por acción (blog, inscripciones, consultas...).
 */
export const ROLES_POR_AREA = {
  /** Capacitaciones, sedes, edificios, aulas, profesores, calendario, inscripciones. */
  capacitaciones: [Role.ADMIN, Role.SUPER_ADMIN, Role.CIEPI],
  /** Mentores, áreas de mentoría, horarios, bloqueos y reservas. */
  mentorias: [Role.ADMIN, Role.SUPER_ADMIN, Role.CIEPI],
  /** Eventos (el blog tiene su propia máquina de estados). */
  contenido: [Role.ADMIN, Role.SUPER_ADMIN, Role.CIEPI, Role.RELACIONES_PUBLICAS],
  /** Envío del boletín y gestión de suscriptores. */
  newsletter: [Role.ADMIN, Role.SUPER_ADMIN, Role.RELACIONES_PUBLICAS],
  /** Atención de consultas de contacto. */
  consultas: [Role.ADMIN, Role.SUPER_ADMIN, Role.CIEPI, Role.RELACIONES_PUBLICAS],
  /** Catálogos de configuración (tipos de consulta), usuarios y roles. */
  configuracion: [Role.ADMIN, Role.SUPER_ADMIN],
} as const;

export type AreaAdmin = keyof typeof ROLES_POR_AREA;

export function rolPuedeModificar(area: AreaAdmin, rol: number | null | undefined): boolean {
  return rol != null && (ROLES_POR_AREA[area] as readonly number[]).includes(rol);
}

export type ResultadoAutorizacion =
  | { ok: true; adminId: number; rol: number; email: string | null }
  | { ok: false; respuesta: NextResponse };

/**
 * Autoriza una modificación en un área. El rol se lee de la base de datos (no del JWT,
 * que puede estar desactualizado) y el usuario debe seguir activo.
 *   const auth = await requireArea("capacitaciones");
 *   if (!auth.ok) return auth.respuesta;
 */
export async function requireArea(area: AreaAdmin): Promise<ResultadoAutorizacion> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin || !session.user.adminId) {
    return {
      ok: false,
      respuesta: NextResponse.json(
        { success: false, error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      ),
    };
  }
  const res = await query(
    `SELECT rol_id FROM ciepi.usuarios_administradores WHERE id = $1 AND activo = true`,
    [session.user.adminId]
  );
  const rol = res.rows[0]?.rol_id as number | undefined;
  if (!rolPuedeModificar(area, rol)) {
    return {
      ok: false,
      respuesta: NextResponse.json(
        { success: false, error: "Tu rol no tiene permiso para realizar esta acción." },
        { status: 403 }
      ),
    };
  }
  return { ok: true, adminId: Number(session.user.adminId), rol: rol as number, email: session.user.email ?? null };
}
