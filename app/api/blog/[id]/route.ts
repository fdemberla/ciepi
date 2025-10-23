import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = resolvedParams;

    // Only return published blogs (estado = 6)
    const blogs_query = `
      SELECT 
        b.id,
        b.titulo,
        b.imagen_banner,
        b.palabras_clave,
        b.contenido,
        b.creado_en,
        u.nombre as autor_nombre,
        u.correo as autor_email
      FROM ciepi.blogs b
      LEFT JOIN ciepi.usuarios_administradores u ON b.creado_por = u.id
      WHERE b.id = $1 AND b.estado = 6
    `;

    const result = await query(blogs_query, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Blog no encontrado o no está publicado" },
        { status: 404 }
      );
    }

    const blog = result.rows[0];

    return NextResponse.json({
      success: true,
      data: blog,
    });
  } catch (error) {
    console.error("Error fetching blog:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener el blog" },
      { status: 500 }
    );
  }
}
