import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { query, withTransaction } from "@/lib/db";
import { parseId, requireArea } from "@/lib/adminAuth";
import { safeErrorDetail } from "@/lib/apiError";
import { getClientIp } from "@/lib/verificationUtils";
import { cambiarEstado, leerHistorial, respuestaErrorTransicion } from "@/lib/estadosServer";
import {
  NOMBRE_ESTADO_INSCRIPCION,
  isValidInscripcionState,
  puedeGestionarInscripciones,
  transicionesInscripcion,
  validarTransicionInscripcion,
  type InscripcionState,
} from "@/lib/inscripcionStates";

interface Params {
  params: Promise<{
    id: string;
  }>;
}

function noAutorizado() {
  return NextResponse.json(
    { success: false, error: "No autorizado. Se requieren permisos de administrador." },
    { status: 401 }
  );
}

/** Nombre legible de un estado guardado como texto en el historial. */
function nombreEstado(valor: unknown, nombres: Map<number, string>): string | null {
  if (valor === null || valor === undefined) return null;
  const id = Number(valor);
  return nombres.get(id) ?? NOMBRE_ESTADO_INSCRIPCION[id as InscripcionState] ?? String(valor);
}

// GET - Estado actual, transiciones disponibles para el rol e historial de la inscripción
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.isAdmin) return noAutorizado();

    const inscripcionId = parseId((await params).id);
    if (!inscripcionId) {
      return NextResponse.json({ success: false, error: "ID de inscripción inválido" }, { status: 400 });
    }

    const res = await query(
      `SELECT i.id, i.estado_inscripcion, i.fecha_ultima_actualizacion,
              est.nombre AS estado_nombre, est.descripcion AS estado_descripcion
         FROM ciepi.inscripciones i
         LEFT JOIN ciepi.inscripciones_estados est ON est.id = i.estado_inscripcion
        WHERE i.id = $1`,
      [inscripcionId]
    );
    if (res.rows.length === 0) {
      return NextResponse.json({ success: false, error: "Inscripción no encontrada" }, { status: 404 });
    }
    const fila = res.rows[0];

    const [historial, estados] = await Promise.all([
      leerHistorial(query, "inscripcion", inscripcionId),
      query("SELECT id, nombre FROM ciepi.inscripciones_estados", []),
    ]);
    const nombres = new Map<number, string>(estados.rows.map((r) => [Number(r.id), r.nombre]));
    const estadoId = Number(fila.estado_inscripcion);

    return NextResponse.json({
      success: true,
      data: {
        id: fila.id,
        estado: {
          id: estadoId,
          nombre: fila.estado_nombre ?? nombreEstado(estadoId, nombres),
          descripcion: fila.estado_descripcion ?? "",
        },
        fecha_ultima_actualizacion: fila.fecha_ultima_actualizacion,
        puede_gestionar: puedeGestionarInscripciones(session.user.rolId),
        transiciones: transicionesInscripcion(estadoId, session.user.rolId),
        historial: historial.map((h) => ({
          ...h,
          estado_de_nombre: nombreEstado(h.estado_de, nombres),
          estado_a_nombre: nombreEstado(h.estado_a, nombres),
        })),
      },
    });
  } catch (error) {
    console.error("Error obteniendo inscripción:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor", details: safeErrorDetail(error) },
      { status: 500 }
    );
  }
}

// PUT - Cambiar el estado de una inscripción
// Body: { estado_inscripcion: número destino, estado_actual: número que vio la UI, motivo?: string }
export async function PUT(request: NextRequest, { params }: Params) {
  try {
    // Rol leído de la BD (el del JWT puede estar desactualizado) y usuario activo.
    const auth = await requireArea("capacitaciones");
    if (!auth.ok) return auth.respuesta;

    const rol = auth.rol;
    if (!puedeGestionarInscripciones(rol)) {
      return NextResponse.json(
        { success: false, error: "Tu rol solo puede consultar las inscripciones, no cambiar su estado." },
        { status: 403 }
      );
    }
    const adminId = auth.adminId;

    const inscripcionId = parseId((await params).id);
    if (!inscripcionId) {
      return NextResponse.json({ success: false, error: "ID de inscripción inválido" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const destino = Number(body?.estado_inscripcion);
    const actual = Number(body?.estado_actual);
    if (!Number.isInteger(destino) || !isValidInscripcionState(destino)) {
      return NextResponse.json({ success: false, error: "Estado de inscripción inválido" }, { status: 400 });
    }
    if (!Number.isInteger(actual) || !isValidInscripcionState(actual)) {
      return NextResponse.json(
        { success: false, error: "Falta el estado actual de la inscripción. Recarga la página." },
        { status: 400 }
      );
    }
    const motivo =
      typeof body?.motivo === "string" && body.motivo.trim() ? body.motivo.trim().slice(0, 500) : null;

    const validacion = validarTransicionInscripcion(actual, destino, { rol, motivo });
    if (!validacion.ok) {
      return NextResponse.json({ success: false, error: validacion.motivo }, { status: validacion.status });
    }
    const t = validacion.transicion;

    const fila = await withTransaction(async (q) => {
      // UPDATE condicionado a `actual`: si otra persona lo cambió, ErrorTransicion 409.
      await cambiarEstado(q, {
        entidad: "inscripcion",
        tabla: "ciepi.inscripciones",
        columnaEstado: "estado_inscripcion",
        id: inscripcionId,
        de: actual,
        a: destino,
        accion: t.accion,
        actor: { tipo: "admin", id: adminId, descripcion: auth.email },
        motivo,
        override: t.override,
        ip: getClientIp(request),
      });
      const res = await q(
        `UPDATE ciepi.inscripciones i
            SET fecha_ultima_actualizacion = NOW(), actualizado_por = $2
           FROM ciepi.inscripciones_estados est
          WHERE i.id = $1 AND est.id = i.estado_inscripcion
         RETURNING i.id, i.estado_inscripcion, i.fecha_ultima_actualizacion,
                   est.nombre AS estado_nombre, est.descripcion AS estado_descripcion`,
        [inscripcionId, adminId]
      );
      return res.rows[0];
    });

    if (t.override) {
      console.warn(
        `[Inscripción override] Admin ${adminId} (rol ${rol}) cambió la inscripción ${inscripcionId}: ${actual} -> ${destino}`
      );
    }

    const estado = {
      id: destino,
      nombre: fila?.estado_nombre ?? NOMBRE_ESTADO_INSCRIPCION[destino],
      descripcion: fila?.estado_descripcion ?? "",
    };
    return NextResponse.json({
      success: true,
      message: "Estado de inscripción actualizado correctamente",
      data: {
        inscripcion_id: inscripcionId,
        estado,
        // Compatibilidad con la respuesta anterior.
        nuevo_estado: { id: estado.id, nombre: estado.nombre },
        fecha_actualizacion: fila?.fecha_ultima_actualizacion ?? null,
        transiciones: transicionesInscripcion(destino, rol),
      },
    });
  } catch (error) {
    const r = respuestaErrorTransicion(error);
    if (r) return r;
    console.error("Error actualizando estado de inscripción:", error);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor", details: safeErrorDetail(error) },
      { status: 500 }
    );
  }
}
