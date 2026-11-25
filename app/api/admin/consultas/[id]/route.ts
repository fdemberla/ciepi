import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, withTransaction } from "@/lib/db";
import { parseId } from "@/lib/adminAuth";
import { safeErrorDetail } from "@/lib/apiError";
import { getClientIp } from "@/lib/verificationUtils";
import { cambiarEstado, leerHistorial, respuestaErrorTransicion, type Q } from "@/lib/estadosServer";
import {
  puedeEliminarConsulta,
  transicionesConsulta,
  validarAccionConsulta,
} from "@/lib/estados/consulta";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

/**
 * Sesión de administrador con el rol leído de la BD (el del JWT puede estar
 * desactualizado). Devuelve la respuesta de error lista para retornar.
 */
async function sesionAdmin(): Promise<
  | { ok: true; adminId: number; rol: number; correo: string | null }
  | { ok: false; respuesta: NextResponse }
> {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.isAdmin || !session.user.adminId) {
    return {
      ok: false,
      respuesta: NextResponse.json(
        { success: false, error: "No autorizado. Se requieren permisos de administrador." },
        { status: 401 }
      ),
    };
  }
  const r = await query(
    `SELECT rol_id FROM ciepi.usuarios_administradores WHERE id = $1 AND activo = true`,
    [session.user.adminId]
  );
  if (r.rows.length === 0) {
    return {
      ok: false,
      respuesta: NextResponse.json({ success: false, error: "Usuario administrador no activo." }, { status: 403 }),
    };
  }
  return { ok: true, adminId: session.user.adminId, rol: Number(r.rows[0].rol_id), correo: session.user.email ?? null };
}

/** Respuestas anteriores (más reciente primero). Tolera que la tabla aún no exista. */
async function leerRespuestas(q: Q, consultaId: number) {
  try {
    const r = await q(
      `SELECT cr.id, cr.respuesta, cr.admin_id, cr.creado_en,
              NULLIF(TRIM(CONCAT(u.nombre, ' ', u.apellido)), '') AS admin_nombre
         FROM ciepi.consultas_respuestas cr
         LEFT JOIN ciepi.usuarios_administradores u ON u.id = cr.admin_id
        WHERE cr.consulta_id = $1
        ORDER BY cr.creado_en DESC, cr.id DESC`,
      [consultaId]
    );
    return r.rows;
  } catch (error) {
    // 42P01 = tabla inexistente (falta ejecutar database/fase2/30_consultas.sql)
    if ((error as { code?: string })?.code === "42P01") return [];
    throw error;
  }
}

async function leerHistorialSeguro(q: Q, consultaId: number) {
  try {
    return await leerHistorial(q, "consulta", consultaId);
  } catch (error) {
    if ((error as { code?: string })?.code === "42P01") return [];
    throw error;
  }
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    const sesion = await sesionAdmin();
    if (!sesion.ok) return sesion.respuesta;

    const id = parseId((await params).id);
    if (!id) {
      return NextResponse.json({ success: false, error: "Consulta no válida." }, { status: 400 });
    }

    const consultaQuery = `
      SELECT
        c.id,
        c.nombre,
        c.email,
        c.telefono,
        c.tipo_consulta_id,
        tc.nombre as tipo_consulta,
        c.sede_id,
        sf.nombre as sede,
        c.area_formacion_id,
        af.nombre as area_formacion,
        c.curso_interes,
        c.comentarios,
        c.respuesta,
        c.respondido_por,
        u.nombre as respondido_por_nombre,
        c.fecha_respuesta,
        c.estado,
        c.fecha_creacion,
        c.fecha_actualizacion,
        c.recaptcha_score
      FROM ciepi.consultas c
      LEFT JOIN ciepi.tipos_consulta tc ON c.tipo_consulta_id = tc.id
      LEFT JOIN ciepi.sedes sf ON c.sede_id = sf.id
      LEFT JOIN ciepi.areas_formacion af ON c.area_formacion_id = af.id
      LEFT JOIN ciepi.usuarios_administradores u ON c.respondido_por = u.id
      WHERE c.id = $1
    `;

    const result = await query(consultaQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Consulta no encontrada" }, { status: 404 });
    }

    const consulta = result.rows[0];
    const [historial, respuestas] = await Promise.all([leerHistorialSeguro(query, id), leerRespuestas(query, id)]);

    return NextResponse.json({
      success: true,
      data: {
        ...consulta,
        transiciones: transicionesConsulta(consulta.estado, sesion.rol),
        historial,
        respuestas_previas: respuestas,
      },
      permisos: { eliminar: puedeEliminarConsulta(sesion.rol) },
    });
  } catch (error) {
    console.error("Error obteniendo consulta:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al obtener consulta",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Cambio de estado de una consulta. Cuerpo:
 *   { accion: "tomar" | "responder" | "cerrar" | "reabrir",
 *     estado_actual: <estado que se veía en pantalla>,
 *     respuesta?: string   (obligatoria para "responder"),
 *     motivo?: string      (obligatorio para reabrir una consulta cerrada) }
 * En lugar de `accion` se acepta `estado` con el estado destino.
 * El UPDATE se condiciona a `estado_actual`: si otra persona la cambió, 409.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    const sesion = await sesionAdmin();
    if (!sesion.ok) return sesion.respuesta;

    const id = parseId((await params).id);
    if (!id) {
      return NextResponse.json({ success: false, error: "Consulta no válida." }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ success: false, error: "Cuerpo de la petición no válido." }, { status: 400 });
    }

    const v = validarAccionConsulta({
      estadoActual: body.estado_actual,
      accion: body.accion,
      estadoDestino: body.estado,
      respuesta: body.respuesta,
      motivo: body.motivo,
      rol: sesion.rol,
    });
    if (!v.ok) {
      return NextResponse.json({ success: false, error: v.motivo }, { status: v.status });
    }

    const t = v.transicion;
    const actor = { tipo: "admin" as const, id: sesion.adminId, descripcion: sesion.correo };
    const ip = getClientIp(request);

    const fila = await withTransaction(async (q) => {
      if (t.accion === "responder") {
        // Hora de la BD (misma convención que fecha_creacion, timestamp sin zona).
        const ahora = (await q(`SELECT LOCALTIMESTAMP AS ahora`)).rows[0].ahora;
        const actualizada = await cambiarEstado(q, {
          entidad: "consulta",
          tabla: "ciepi.consultas",
          columnaEstado: "estado",
          id,
          de: v.de,
          a: t.a,
          accion: t.accion,
          actor,
          motivo: v.motivo,
          override: t.override,
          ip,
          extra: {
            respuesta: v.respuesta,
            respondido_por: sesion.adminId,
            fecha_respuesta: ahora,
          },
        });
        // Se conservan todas las respuestas (la columna respuesta guarda solo la última).
        await q(
          `INSERT INTO ciepi.consultas_respuestas (consulta_id, respuesta, admin_id) VALUES ($1, $2, $3)`,
          [id, v.respuesta, sesion.adminId]
        );
        return actualizada;
      }
      return cambiarEstado(q, {
        entidad: "consulta",
        tabla: "ciepi.consultas",
        columnaEstado: "estado",
        id,
        de: v.de,
        a: t.a,
        accion: t.accion,
        actor,
        motivo: v.motivo,
        override: t.override,
        ip,
      });
    });

    // Efectos posteriores al commit.
    // TODO: enviar al ciudadano un correo con la respuesta cuando t.accion === "responder"
    // (hoy no se envía ningún correo; la respuesta solo queda registrada en el sistema).

    return NextResponse.json({
      success: true,
      message: t.accion === "responder" ? "Respuesta guardada" : "Consulta actualizada",
      data: {
        id: fila.id,
        estado: fila.estado,
        respuesta: fila.respuesta,
        fecha_respuesta: fila.fecha_respuesta,
        fecha_actualizacion: fila.fecha_actualizacion,
        transiciones: transicionesConsulta(String(fila.estado), sesion.rol),
      },
    });
  } catch (error) {
    const r = respuestaErrorTransicion(error);
    if (r) return r;
    console.error("Error actualizando consulta:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al actualizar consulta",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    const sesion = await sesionAdmin();
    if (!sesion.ok) return sesion.respuesta;
    if (!puedeEliminarConsulta(sesion.rol)) {
      return NextResponse.json(
        { success: false, error: "Solo un administrador puede eliminar consultas." },
        { status: 403 }
      );
    }

    const id = parseId((await params).id);
    if (!id) {
      return NextResponse.json({ success: false, error: "Consulta no válida." }, { status: 400 });
    }

    const result = await query(`DELETE FROM ciepi.consultas WHERE id = $1 RETURNING id`, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Consulta no encontrada" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Consulta eliminada exitosamente",
    });
  } catch (error) {
    console.error("Error eliminando consulta:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error al eliminar consulta",
        details: safeErrorDetail(error),
      },
      { status: 500 }
    );
  }
}
