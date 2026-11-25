import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, withTransaction } from "@/lib/db";
import { canDeleteBlog } from "@/lib/permissions";
import { parseId, rolPuedeModificar } from "@/lib/adminAuth";
import { safeErrorDetail } from "@/lib/apiError";
import {
  ETIQUETA_ESTADO_BLOG,
  esEstadoBlog,
  motivoNoEditable,
  puedeEditarBlog,
  transicionesBlog,
  validarTransicionBlog,
  type ContextoBlog,
  type EstadoBlog,
} from "@/lib/estados/blog";
import {
  cambiarEstado,
  ErrorTransicion,
  leerHistorial,
  respuestaErrorTransicion,
} from "@/lib/estadosServer";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Sesión de administrador con el rol leído de la BD (no del JWT, que puede estar
 * desactualizado). Devuelve la respuesta de error lista para retornar o el actor.
 */
async function obtenerActor(): Promise<
  { error: NextResponse } | { adminId: number; rol: number }
> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.isAdmin || !session.user.adminId) {
    return {
      error: NextResponse.json(
        { success: false, error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      ),
    };
  }
  const res = await query(
    `SELECT rol_id FROM ciepi.usuarios_administradores WHERE id = $1 AND activo = true`,
    [session.user.adminId]
  );
  if (res.rows.length === 0) {
    return {
      error: NextResponse.json(
        { success: false, error: "Usuario no encontrado" },
        { status: 404 }
      ),
    };
  }
  return { adminId: Number(session.user.adminId), rol: Number(res.rows[0].rol_id) };
}

function ipDe(request: NextRequest): string | null {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

// GET: Obtener un blog específico (con transiciones disponibles e historial)
export async function GET(request: NextRequest, { params }: Params) {
  try {
    const actor = await obtenerActor();
    if ("error" in actor) return actor.error;

    const id = parseId((await params).id);
    if (!id) {
      return NextResponse.json({ success: false, error: "Blog no válido." }, { status: 400 });
    }

    const blogQuery = `
      SELECT
        b.id,
        b.titulo,
        b.contenido,
        b.imagen_banner,
        b.palabras_clave,
        b.creado_por,
        u.nombre as autor_nombre,
        b.creado_en,
        b.estado,
        b.aprobado_por,
        ua.nombre as aprobado_por_nombre,
        b.aprobado_en
      FROM ciepi.blogs b
      LEFT JOIN ciepi.usuarios_administradores u ON b.creado_por = u.id
      LEFT JOIN ciepi.usuarios_administradores ua ON b.aprobado_por = ua.id
      WHERE b.id = $1
    `;

    const result = await query(blogQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Blog no encontrado" },
        { status: 404 }
      );
    }

    const blog = result.rows[0];
    const ctx: ContextoBlog = {
      rol: actor.rol,
      esAutor: Number(blog.creado_por) === actor.adminId,
    };
    const historial = await leerHistorial(query, "blog", id);

    return NextResponse.json({
      success: true,
      data: {
        ...blog,
        estado_nombre: ETIQUETA_ESTADO_BLOG[blog.estado as EstadoBlog] ?? null,
        es_autor: ctx.esAutor,
        puede_editar: puedeEditarBlog(blog.estado, ctx),
        motivo_no_editable: motivoNoEditable(blog.estado, ctx),
        transiciones: transicionesBlog(blog.estado, ctx),
        historial,
      },
    });
  } catch (error) {
    console.error("Error obteniendo blog:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener blog",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}

/** Valida y normaliza los campos de contenido presentes en el cuerpo (undefined = no se toca). */
function camposDeContenido(body: Record<string, unknown>):
  | { error: string }
  | { campos: Record<string, unknown> } {
  const campos: Record<string, unknown> = {};

  if (body.titulo !== undefined) {
    if (typeof body.titulo !== "string" || !body.titulo.trim()) {
      return { error: "El título no puede estar vacío." };
    }
    if (body.titulo.trim().length > 255) {
      return { error: "El título no puede superar los 255 caracteres." };
    }
    campos.titulo = body.titulo.trim();
  }

  if (body.contenido !== undefined) {
    if (!Array.isArray(body.contenido) || body.contenido.length === 0) {
      return { error: "El contenido debe ser un array válido de Slate y no puede estar vacío." };
    }
    campos.contenido = JSON.stringify(body.contenido);
  }

  if (body.imagen_banner !== undefined) {
    if (body.imagen_banner !== null && typeof body.imagen_banner !== "string") {
      return { error: "La imagen del banner no es válida." };
    }
    campos.imagen_banner = body.imagen_banner || null;
  }

  if (body.palabras_clave !== undefined) {
    if (
      !Array.isArray(body.palabras_clave) ||
      !body.palabras_clave.every((p) => typeof p === "string")
    ) {
      return { error: "Las palabras clave deben ser una lista de textos." };
    }
    campos.palabras_clave = JSON.stringify(body.palabras_clave);
  }

  return { campos };
}

/**
 * PUT: Actualizar blog. Acepta, por separado o juntos:
 * - Contenido (titulo, contenido, imagen_banner, palabras_clave): solo el autor o un
 *   administrador, y solo en Borrador o Rechazado (ver lib/estados/blog.ts).
 * - Cambio de estado: { estado, estado_actual, motivo }. Pasa por validarTransicionBlog
 *   y cambiarEstado (UPDATE condicionado + ciepi.estado_historial). Si estado_actual no
 *   coincide con el de la BD responde 409.
 * Todo va en una transacción; si viene contenido y estado, primero se guarda el
 * contenido (en el estado de origen) y luego se cambia el estado.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const actor = await obtenerActor();
    if ("error" in actor) return actor.error;
    // Solo roles del área de contenido; la máquina de estados aplica además sus reglas por acción.
    if (!rolPuedeModificar("contenido", actor.rol)) {
      return NextResponse.json(
        { success: false, error: "Tu rol no tiene permiso para realizar esta acción." },
        { status: 403 }
      );
    }

    const id = parseId((await params).id);
    if (!id) {
      return NextResponse.json({ success: false, error: "Blog no válido." }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Cuerpo de la petición inválido." }, { status: 400 });
    }

    const contenido = camposDeContenido(body);
    if ("error" in contenido) {
      return NextResponse.json({ success: false, error: contenido.error }, { status: 400 });
    }
    const hayContenido = Object.keys(contenido.campos).length > 0;
    const hayEstado = body.estado !== undefined && body.estado !== null;

    if (!hayContenido && !hayEstado) {
      return NextResponse.json(
        { success: false, error: "Se debe proporcionar al menos un campo para actualizar" },
        { status: 400 }
      );
    }

    const motivo =
      typeof body.motivo === "string" && body.motivo.trim()
        ? body.motivo.trim().slice(0, 2000)
        : null;

    const resultado = await withTransaction(async (q) => {
      const actual = await q(
        `SELECT estado, creado_por FROM ciepi.blogs WHERE id = $1 FOR UPDATE`,
        [id]
      );
      if (actual.rows.length === 0) {
        throw new ErrorTransicion(404, "Blog no encontrado", "NO_ENCONTRADO");
      }
      const estadoDb = Number(actual.rows[0].estado);
      const ctx: ContextoBlog = {
        rol: actor.rol,
        esAutor: Number(actual.rows[0].creado_por) === actor.adminId,
      };

      // El cliente dice desde qué estado actúa: si ya no es ese, otra persona lo cambió.
      if (body.estado_actual !== undefined && Number(body.estado_actual) !== estadoDb) {
        throw new ErrorTransicion(
          409,
          "El estado del blog cambió mientras lo editabas. Recarga la página para ver el estado actual.",
          "CONFLICTO_ESTADO"
        );
      }

      // 1. Contenido
      if (hayContenido) {
        const bloqueo = motivoNoEditable(estadoDb, ctx);
        if (bloqueo) throw new ErrorTransicion(403, bloqueo, "NO_EDITABLE");

        const cols = Object.keys(contenido.campos);
        const valores = Object.values(contenido.campos);
        await q(
          `UPDATE ciepi.blogs SET ${cols.map((c, i) => `${c} = $${i + 1}`).join(", ")}
            WHERE id = $${cols.length + 1} AND estado = $${cols.length + 2}`,
          [...valores, id, estadoDb]
        );
      }

      // 2. Estado
      let estadoFinal = estadoDb;
      if (hayEstado) {
        const destino = Number(body.estado);
        if (!esEstadoBlog(destino)) {
          throw new ErrorTransicion(400, "Estado de blog inválido.");
        }
        // Reenviar el mismo estado con solo contenido no es un cambio de estado.
        if (destino !== estadoDb || !hayContenido) {
          const v = validarTransicionBlog(estadoDb, destino, { ...ctx, motivo });
          if (!v.ok) throw new ErrorTransicion(v.status, v.motivo);

          const accion = v.transicion.accion;
          const extra: Record<string, unknown> = {};
          if (accion === "aprobar_ciepi" || accion === "publicar") {
            extra.aprobado_por = actor.adminId;
            extra.aprobado_en = new Date();
          } else if (destino === 1) {
            // Vuelve a Borrador: la aprobación anterior ya no vale.
            extra.aprobado_por = null;
            extra.aprobado_en = null;
          }

          await cambiarEstado<EstadoBlog>(q, {
            entidad: "blog",
            tabla: "ciepi.blogs",
            columnaEstado: "estado",
            id,
            de: estadoDb as EstadoBlog,
            a: destino,
            accion,
            actor: { tipo: "admin", id: actor.adminId },
            motivo,
            override: v.transicion.override,
            extra,
            ip: ipDe(request),
          });
          estadoFinal = destino;
        }
      }

      const fila = await q(`SELECT id, titulo, estado FROM ciepi.blogs WHERE id = $1`, [id]);
      return {
        ...fila.rows[0],
        estado_nombre: ETIQUETA_ESTADO_BLOG[estadoFinal as EstadoBlog] ?? null,
        transiciones: transicionesBlog(estadoFinal, ctx),
        puede_editar: puedeEditarBlog(estadoFinal, ctx),
      };
    });

    return NextResponse.json({
      success: true,
      message: "Blog actualizado exitosamente",
      data: resultado,
    });
  } catch (error) {
    const respuesta = respuestaErrorTransicion(error);
    if (respuesta) return respuesta;
    console.error("Error actualizando blog:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar blog",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}

// DELETE: Eliminar blog
export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const actor = await obtenerActor();
    if ("error" in actor) return actor.error;

    // Validación de permisos para ELIMINAR
    if (!canDeleteBlog(actor.rol)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "No tienes permisos para eliminar blogs. Solo administradores pueden hacerlo.",
        },
        { status: 403 }
      );
    }

    const id = parseId((await params).id);
    if (!id) {
      return NextResponse.json({ success: false, error: "Blog no válido." }, { status: 400 });
    }

    const deleteQuery = `
      DELETE FROM ciepi.blogs
      WHERE id = $1
      RETURNING id, titulo
    `;

    const result = await query(deleteQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: "Blog no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Blog "${result.rows[0].titulo}" eliminado exitosamente`,
    });
  } catch (error) {
    console.error("Error eliminando blog:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al eliminar blog",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
