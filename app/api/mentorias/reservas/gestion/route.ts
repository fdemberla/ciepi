import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { hashConfirmToken, maskEmail } from "@/lib/newsletter";
import { cargarReservaCompleta, lugarReserva, type ReservaCompleta } from "@/lib/mentoriasServer";
import { primerNombre } from "@/lib/mentoriaSolicitud";
import { enviarCorreosConfirmacion, enviarCorreosCancelacion } from "@/lib/mentoriasEmails";

export const dynamic = "force-dynamic";

const TOKEN = /^[a-f0-9]{64}$/;

/** Estado visible para el público (una pendiente vencida se muestra como expirada). */
function estadoVisible(r: ReservaCompleta): string {
  if (r.estado === "pendiente_verificacion" && r.pendiente_expira && new Date(r.pendiente_expira) <= new Date()) {
    return "expirada";
  }
  return r.estado;
}

/** Datos mínimos de la reserva para la página de gestión (sin teléfono ni correo completo). */
function vistaPublica(r: ReservaCompleta) {
  return {
    estado: estadoVisible(r),
    nombre: primerNombre(r.nombre),
    correo: maskEmail(r.correo),
    mentor: `${r.mentor_nombre} ${r.mentor_apellido}`,
    inicio: new Date(r.inicio).toISOString(),
    fin: new Date(r.fin).toISOString(),
    modalidad: r.modalidad,
    lugar: lugarReserva(r),
    area: r.area_nombre,
    pendiente_expira: r.pendiente_expira ? new Date(r.pendiente_expira).toISOString() : null,
    puede_cancelar: r.estado === "confirmada" && new Date(r.inicio) > new Date(),
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

/** Acciones del ciudadano desde el enlace del correo: confirmar o cancelar. */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = typeof body.token === "string" ? body.token : null;
  const accion = body.accion;
  const r = await porToken(token);
  if (!r || !token) return NextResponse.json({ success: false, error: "El enlace no es válido." }, { status: 404 });

  try {
    if (accion === "confirmar") {
      // Transición atómica: solo una solicitud puede confirmar, y solo si no venció.
      const upd = await query(
        `UPDATE ciepi.mentoria_reservas
         SET estado = 'confirmada', confirmada_en = NOW(), fecha_actualizacion = NOW()
         WHERE id = $1 AND estado = 'pendiente_verificacion' AND pendiente_expira > NOW()
         RETURNING id`,
        [r.id]
      );
      if (upd.rowCount === 0) {
        if (r.estado === "confirmada") return NextResponse.json({ success: true, data: vistaPublica(r) });
        const vencida = r.estado === "pendiente_verificacion" || r.estado === "expirada";
        return NextResponse.json(
          {
            success: false,
            error: vencida
              ? "El tiempo para confirmar venció y el horario se liberó. Reserva de nuevo."
              : "Esta reserva ya no está pendiente de confirmación.",
          },
          { status: vencida ? 410 : 409 }
        );
      }
      const actual = (await cargarReservaCompleta({ id: r.id }))!;
      try {
        await enviarCorreosConfirmacion(actual, token);
      } catch (error) {
        console.error("Reserva confirmada, pero falló el correo de confirmación:", error);
      }
      return NextResponse.json({ success: true, data: vistaPublica(actual) });
    }

    if (accion === "cancelar") {
      const upd = await query(
        `UPDATE ciepi.mentoria_reservas
         SET estado = 'cancelada_usuario', cancelada_en = NOW(), fecha_actualizacion = NOW()
         WHERE id = $1 AND estado = 'confirmada' AND inicio > NOW()
         RETURNING id`,
        [r.id]
      );
      if (upd.rowCount === 0) {
        return NextResponse.json({ success: false, error: "Esta reserva ya no se puede cancelar." }, { status: 409 });
      }
      const actual = (await cargarReservaCompleta({ id: r.id }))!;
      await enviarCorreosCancelacion(actual);
      return NextResponse.json({ success: true, data: vistaPublica(actual) });
    }

    return NextResponse.json({ success: false, error: "Acción no válida." }, { status: 400 });
  } catch (error) {
    console.error("Error en gestión de reserva de mentoría:", error);
    return NextResponse.json({ success: false, error: "No se pudo completar la acción." }, { status: 500 });
  }
}
