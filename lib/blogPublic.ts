import { cache } from "react";
import { query } from "@/lib/db";

export interface PublishedBlog {
  id: number;
  titulo: string;
  imagen_banner: string | null;
  palabras_clave: string[];
  contenido: unknown;
  creado_en: string;
  autor_nombre: string;
  autor_email: string;
}

// En la BD el id es entero (el script SQL de referencia dice UUID, pero no es lo desplegado).
const ID_RE = /^[0-9]{1,18}$/;

/**
 * Devuelve un blog publicado (estado = 6) o null.
 * Lo usan la API pública y la página de detalle (que lo llama directo, sin HTTP).
 * `cache` evita la consulta duplicada entre generateMetadata y la página.
 */
export const getPublishedBlog = cache(
  async (id: string): Promise<PublishedBlog | null> => {
    if (!ID_RE.test(id)) return null;

    const result = await query(
      `
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
    `,
      [id]
    );

    return (result.rows[0] as PublishedBlog | undefined) ?? null;
  }
);
