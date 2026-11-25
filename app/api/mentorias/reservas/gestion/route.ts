import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { hashConfirmToken, maskEmail } from "@/lib/newsletter";
import {
  cargarReservaCompleta,
  lugarReserva,
  bloquearReserva,
  transicionarReserva,
  type ReservaCompleta,
} from "@/lib/mentoriasServer";
import { estadoEfectivoReserva, transicionesReserva } from "@/lib/estados/mentoriaReserva";
import { ErrorTransicion } from "@/lib/estadosServer";
import { getClientIp } from "@/lib/verificationUtils";
import { primerNombre } from "@/lib/mentoriaSolicitud";
import { enviarCorreosConfirmacion, enviarCorreosCancelacion } from "@/lib/mentoriasEmails";

export const dynamic = "force-dynamic";

const TOKEN = /^[a-f0-9]{64}$/;

/** Datos mínimos de la reserva para la página de gestión (sin teléfono ni correo completo). */
function vistaPublica(r: ReservaCompleta) {
  const ahora = new Date();
  const acciones = transicionesReserva(r, { actor: "ciudadano", ahora, mentorActivo: r.mentor_activo }).map(
    (t) => t.accion
  );
  return {
    // Una pendiente vencida se muestra como expirada.
    estado: estadoEfectivoReserva(r.estado, r.pendiente_expira, ahora),
    nombre: primerNombre(r.nombre),
    correo: maskEmail(r.correo),
    mentor: `${r.mentor_nombre} ${r.mentor_apellido}`,
    inicio: new Date(r.inicio).toISOString(),
    fin: new Date(r.fin).toISOString(),
    modalidad: r.modalidad,
    lugar: lugarReserva(r),
    area: r.area_nombre,
    pendiente_expira: r.pendiente_expira ? new Date(r.pendiente_expira).toISOString() : null,
    puede_confirmar: acciones.includes("confirmar"),
    puede_cancelar: acciones.includes("cancelar"),
    // Pendiente vigente cuyo mentor dejó de atender: no se puede confirmar.
    mentor_no_disponible: r.estado === "pendiente_verificacion" && !r.mentor_activo,
  };
}

async function porToken(token: string | null) {
  if (!token || !TOKEN.test(token)) return null;
  return cargarReservaCompleta({ tokenHash: hashConfirmToken(token) });
}

export async function GET(request: NextRequest) {
  const r = await porToken(request.nextUrl.searchParams.get("token"));
  if (!r) return NextResponse.json({ success: false, error: "El enlace no es válido." }, { status: 404 });
  return NextResponse.json({ success: true, data: vistaPublica(r) });
}

const DESTINO: Record<string, "confirmada" | "cancelada_usuario"> = {
  confirmar: "confirmada",
  cancelar: "cancelada_usuario",
};

/**
 * Acciones del ciudadano desde el enlace del correo: confirmar o cancelar.
 * El cambio pasa por la máquina de estados (lib/estados/mentoriaReserva.ts) con la
 * reserva y su mentor bloqueados; los correos salen después del commit.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : null;
  const destino = DESTINO[String(body.accion)];
  if (!destino) return NextResponse.json({ success: false, error: "Acción no válida." }, { status: 400 });

  try {
    const r = await porToken(token);
    if (!r || !token) return NextResponse.json({ success: false, error: "El enlace no es válido." }, { status: 404 });

    // Doble clic o reintento tras un fallo de red: confirmar algo ya confirmado no es un error.
    if (destino === "confirmada" && r.estado === "confirmada") {
      return NextResponse.json({ success: true, data: vistaPublica(r) });
    }

    await withTransaction(async (q) => {
      const bloqueada = await bloquearReserva(q, r.id);
      if (!bloqueada) throw new ErrorTransicion(404, "El enlace no es válido.", "NO_ENCONTRADO");
      await transicionarReserva(q, {
        reserva: bloqueada,
        a: destino,
        actor: { tipo: "ciudadano", descripcion: r.correo },
        ip: getClientIp(request),
      });
    });

    const actual = (await cargarReservaCompleta({ id: r.id }))!;
    try {
      if (destino === "confirmada") await enviarCorreosConfirmacion(actual, token);
      else await enviarCorreosCancelacion(actual);
    } catch (error) {
      // El cambio ya quedó guardado: no se responde 500 por un fallo del correo.
      console.error("Reserva de mentoría actualizada, pero falló el correo:", error);
    }
    return NextResponse.json({ success: true, data: vistaPublica(actual) });
  } catch (error) {
    if (error instanceof ErrorTransicion) {
      // Se devuelve también el estado real, para que la página no adivine.
      const real = await porToken(token).catch(() => null);
      if (real && destino === "confirmada" && real.estado === "confirmada") {
        return NextResponse.json({ success: true, data: vistaPublica(real) });
      }
      // Mensajes de la máquina pensados para el admin → texto claro para la persona.
      const mensaje =
        error.status === 400 || error.status === 409
          ? destino === "confirmada"
            ? "Esta reserva ya no está pendiente de confirmación."
            : "Esta reserva ya no se puede cancelar."
          : error.message;
      return NextResponse.json(
        { success: false, error: mensaje, code: error.code, data: real ? vistaPublica(real) : null },
        { status: error.status }
      );
    }
    console.error("Error en gestión de reserva de mentoría:", error);
    return NextResponse.json({ success: false, error: "No se pudo completar la acción. Inténtalo de nuevo." }, { status: 500 });
  }
}