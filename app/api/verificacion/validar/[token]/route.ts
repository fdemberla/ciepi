import { NextRequest, NextResponse } from "next/server";
import { safeErrorDetail } from "@/lib/apiError";
import { withTransaction } from "@/lib/db";
import { hashToken, buscarPorToken, type FilaVerificacionCompleta } from "@/lib/verificationToken";
import { getClientIp } from "@/lib/verificationUtils";
import { validarCanje } from "@/lib/estados/verificacionCorreo";
import { InscripcionState } from "@/lib/inscripcionStates";
import type { BiometriaServidor, DatosPersona } from "@/lib/inscripcionSesion";
import { registrarHistorial } from "@/lib/estadosServer";

interface Params {
  params: Promise<{ token: string }>;
}

interface MetadataInscripcion {
  capacitacion_id?: number | string;
  metodo_validacion?: "biometrica" | "manual";
  biometria?: BiometriaServidor | null;
  contacto?: { correo: string; telefono: string | null };
  ubicacion?: {
    provincia_id: number | null;
    distrito_id: number | null;
    corregimiento_id: number | null;
    calle: string | null;
  };
  persona?: DatosPersona | null;
}

class ErrorCanje extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

type Q = Parameters<Parameters<typeof withTransaction>[0]>[0];

/**
 * Aplica la inscripción dentro de la transacción: crea o actualiza al estudiante con
 * los datos ya verificados, guarda la ubicación y crea la inscripción.
 */
async function aplicarInscripcion(q: Q, fila: FilaVerificacionCompleta, ip: string | null) {
  const meta = fila.metadata as MetadataInscripcion;
  const capacitacionId = parseInt(String(meta.capacitacion_id ?? ""), 10);
  if (!Number.isInteger(capacitacionId)) {
    throw new ErrorCanje(400, "INVALID_TOKEN", "El enlace no corresponde a una inscripción válida.");
  }
  const bio = meta.metodo_validacion === "biometrica" && meta.biometria?.valido ? meta.biometria : null;
  const telefono = meta.contacto?.telefono ?? null;

  // 1. Estudiante
  let estudianteId = fila.id_estudiante;
  try {
    if (estudianteId) {
      await q(
        `UPDATE ciepi.estudiantes
            SET correo = $2, telefono = COALESCE($3, telefono), correo_verificado = true,
                biometria_verificada = biometria_verificada OR $4,
                biometria_id_auditoria = COALESCE($5, biometria_id_auditoria),
                biometria_fecha = CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE biometria_fecha END
          WHERE id = $1`,
        [estudianteId, fila.correo, telefono, Boolean(bio), bio?.id_auditoria ?? null]
      );
    } else {
      const p = meta.persona;
      if (!p) throw new ErrorCanje(400, "INVALID_TOKEN", "Faltan los datos de la persona en la solicitud.");
      const existente = await q(`SELECT id FROM ciepi.estudiantes WHERE cedula = $1`, [p.cedula]);
      if (existente.rows.length > 0) {
        // Se registró por otra vía mientras tanto: se usa ese registro.
        estudianteId = existente.rows[0].id as number;
        await q(
          `UPDATE ciepi.estudiantes SET correo = $2, telefono = COALESCE($3, telefono), correo_verificado = true
            WHERE id = $1`,
          [estudianteId, fila.correo, telefono]
        );
      } else {
        const ins = await q(
          `INSERT INTO ciepi.estudiantes (
             cedula, nombres, apellidos, nombre_cedula, sexo, estado_civil, fecha_nacimiento,
             correo, telefono, correo_verificado, biometria_verificada, biometria_id_auditoria, biometria_fecha
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, $10, $11, $12)
           RETURNING id`,
          [
            p.cedula,
            p.nombres,
            p.apellidos,
            p.nombre_cedula,
            p.sexo,
            p.estado_civil,
            p.fecha_nacimiento,
            fila.correo,
            telefono,
            Boolean(bio),
            bio?.id_auditoria ?? null,
            bio ? new Date() : null,
          ]
        );
        estudianteId = ins.rows[0].id as number;
      }
    }
  } catch (err) {
    if ((err as { code?: string }).code === "23505") {
      throw new ErrorCanje(
        409,
        "EMAIL_TAKEN",
        "Ese correo ya está registrado por otra persona. Vuelve a inscribirte con otro correo."
      );
    }
    throw err;
  }

  // 2. Ubicación
  const u = meta.ubicacion;
  if (u) {
    const upd = await q(
      `UPDATE ciepi.estudiantes_ubicacion
          SET provincia_id = $2, distrito_id = $3, corregimiento_id = $4, calle = $5
        WHERE id_usuario = $1`,
      [estudianteId, u.provincia_id, u.distrito_id, u.corregimiento_id, u.calle]
    );
    if (upd.rowCount === 0) {
      await q(
        `INSERT INTO ciepi.estudiantes_ubicacion (id_usuario, provincia_id, distrito_id, corregimiento_id, calle)
         VALUES ($1, $2, $3, $4, $5)`,
        [estudianteId, u.provincia_id, u.distrito_id, u.corregimiento_id, u.calle]
      );
    }
  }

  // 3. Inscripción (biométrica → Nueva; manual → Pendiente de validación)
  const estadoInicial = bio ? InscripcionState.NUEVA : InscripcionState.PENDIENTE_VALIDACION;
  const nueva = await q(
    `INSERT INTO ciepi.inscripciones (
       id_usuario, id_capacitacion, estado_inscripcion,
       biometria_verificada, biometria_id_auditoria, biometria_score,
       biometria_liveness, biometria_estado, biometria_fecha
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id_usuario, id_capacitacion) DO NOTHING
     RETURNING id, estado_inscripcion`,
    [
      estudianteId,
      capacitacionId,
      estadoInicial,
      Boolean(bio),
      bio?.id_auditoria ?? null,
      bio?.score_similitud ?? null,
      bio?.liveness_score ?? null,
      bio ? bio.estado : "PENDIENTE_VALIDACION_MANUAL",
      bio ? new Date() : null,
    ]
  );
  let inscripcion = nueva.rows[0] as { id: number; estado_inscripcion: number } | undefined;
  let yaExistia = false;
  if (inscripcion) {
    await registrarHistorial(q, {
      entidad: "inscripcion",
      entidadId: inscripcion.id,
      de: null,
      a: estadoInicial,
      accion: "crear",
      actor: { tipo: "ciudadano", descripcion: fila.correo },
      motivo: bio ? "Inscripción con validación biométrica" : "Inscripción con validación manual pendiente",
      ip,
    });
  }
  if (!inscripcion) {
    yaExistia = true;
    const ex = await q(
      `SELECT id, estado_inscripcion FROM ciepi.inscripciones WHERE id_usuario = $1 AND id_capacitacion = $2`,
      [estudianteId, capacitacionId]
    );
    inscripcion = ex.rows[0];
  }

  const cap = await q(
    `SELECT nombre, fecha_inicio_capacitacion FROM ciepi.capacitaciones WHERE id = $1`,
    [capacitacionId]
  );
  const est = await q(`SELECT nombres, apellidos FROM ciepi.estudiantes WHERE id = $1`, [estudianteId]);

  const resultado = {
    estudiante: { id: estudianteId, nombres: est.rows[0]?.nombres, apellidos: est.rows[0]?.apellidos, correo: fila.correo },
    inscripcion_id: inscripcion?.id ?? null,
    estado_inscripcion: inscripcion?.estado_inscripcion ?? null,
    metodo_validacion: bio ? "biometrica" : "manual",
    capacitacion: cap.rows[0] ?? null,
    message: yaExistia
      ? "Ya estabas inscrito en esta capacitación."
      : bio
        ? "Inscripción creada exitosamente"
        : "Inscripción registrada como pendiente de validación por un administrador",
  };

  // 4. Cerrar el enlace (verificado) guardando el resultado para clics repetidos.
  const cierre = await q(
    `UPDATE ciepi.verificacion_correo
        SET estado = 'verificado', usado = true, fecha_uso = $2, ip_uso = $3,
            id_estudiante = $4, resultado = $5
      WHERE id = $1 AND estado = 'pendiente'`,
    [fila.id, new Date(), ip, estudianteId, JSON.stringify(resultado)]
  );
  if (cierre.rowCount === 0) {
    throw new ErrorCanje(409, "TOKEN_ALREADY_USED", "Este enlace ya fue usado.");
  }
  return resultado;
}

function respuestaExito(fila: FilaVerificacionCompleta, resultado: Record<string, unknown>) {
  return NextResponse.json({
    success: true,
    message: "Correo verificado exitosamente",
    data: { tipo: fila.tipo, correo: fila.correo, ...resultado },
  });
}

/**
 * POST /api/verificacion/validar/[token]
 * Canje del enlace del correo. Todo ocurre en UNA transacción con la fila bloqueada:
 * si algo falla, el enlace sigue pendiente y se puede volver a intentar. Un segundo
 * clic sobre un enlace ya verificado devuelve el mismo resultado (idempotente).
 */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      return NextResponse.json(
        { error: "El enlace de verificación no existe", code: "TOKEN_NOT_FOUND" },
        { status: 404 }
      );
    }
    const ip = getClientIp(request);

    const salida = await withTransaction(async (q) => {
      const res = await q(
        `SELECT id, id_estudiante, cedula, correo, tipo, metadata, estado, reenvios, resultado,
                fecha_creacion, fecha_expiracion
           FROM ciepi.verificacion_correo WHERE token = $1 FOR UPDATE`,
        [hashToken(token)]
      );
      const fila = res.rows[0] as FilaVerificacionCompleta | undefined;
      if (!fila) throw new ErrorCanje(404, "TOKEN_NOT_FOUND", "El enlace de verificación no existe");

      if (fila.estado === "verificado") {
        return { fila, resultado: fila.resultado ?? {} };
      }
      const canje = validarCanje(fila, new Date());
      if (!canje.permitido) throw new ErrorCanje(canje.status, canje.codigo, canje.mensaje);
      if (fila.tipo !== "inscripcion") {
        throw new ErrorCanje(400, "INVALID_TOKEN", "Tipo de verificación no soportado.");
      }
      return { fila, resultado: await aplicarInscripcion(q, fila, ip) };
    });

    return respuestaExito(salida.fila, salida.resultado);
  } catch (error) {
    if (error instanceof ErrorCanje) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("Error al validar token:", error);
    return NextResponse.json(
      { error: "Error al validar el enlace. Intenta de nuevo.", details: safeErrorDetail(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/verificacion/validar/[token]
 * Información mínima del enlace (sin datos de contacto ni metadata).
 */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { token } = await params;
    const fila = await buscarPorToken(token);
    if (!fila) {
      return NextResponse.json({ error: "Token no encontrado" }, { status: 404 });
    }
    const canje = validarCanje(fila, new Date());
    return NextResponse.json({
      success: true,
      data: {
        tipo: fila.tipo,
        estado: fila.estado === "verificado" ? "verificado" : canje.permitido ? "pendiente" : canje.codigo,
        fecha_expiracion: fila.fecha_expiracion,
      },
    });
  } catch (error) {
    console.error("Error al obtener información del token:", error);
    return NextResponse.json(
      { error: "Error al obtener información del token", details: safeErrorDetail(error) },
      { status: 500 }
    );
  }
}
