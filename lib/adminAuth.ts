import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

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
