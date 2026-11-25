import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query } from "@/lib/db";
import { puedeGestionarNewsletter } from "@/lib/estados/newsletter";

/**
 * Autoriza la gestión del newsletter (listar suscriptores, enviar el boletín).
 * Roles permitidos: ADMIN, SUPER_ADMIN y RELACIONES_PUBLICAS (ROLES_GESTION_NEWSLETTER).
 * El rol se lee de la base de datos (no del JWT) y el usuario debe seguir activo.
 */
export async function autorizarGestionNewsletter(): Promise<
  | { ok: true; adminId: number; rol: number; email: string | null; nombre: string | null }
  | { ok: false; respuesta: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.isAdmin || !session.user.adminId) {
    return {
      ok: false,
      respuesta: NextResponse.json(
        { error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 },
      ),
    };
  }

  const res = await query(
    `SELECT rol_id FROM ciepi.usuarios_administradores WHERE id = $1 AND activo = true`,
    [session.user.adminId],
  );
  const rol = res.rows[0]?.rol_id as number | undefined;
  if (!puedeGestionarNewsletter(rol)) {
    return {
      ok: false,
      respuesta: NextResponse.json(
        { error: "Tu rol no tiene permiso para gestionar el newsletter." },
        { status: 403 },
      ),
    };
  }

  return {
    ok: true,
    adminId: Number(session.user.adminId),
    rol: rol as number,
    email: session.user.email ?? null,
    nombre: session.user.name ?? null,
  };
}
