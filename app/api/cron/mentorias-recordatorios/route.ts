import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verificarSecretoCron } from "@/lib/cronAuth";
import { cargarReservaCompleta } from "@/lib/mentoriasServer";
import { enviarRecordatorio } from "@/lib/mentoriasEmails";

export const dynamic = "force-dynamic";

/**
 * Tarea programada (cada hora, desde el Programador de tareas de Windows con
 * scripts/recordatorios-mentorias.ps1):
 * 1. Marca como expiradas las reservas que no se confirmaron a tiempo.
 * 2. Envía el recordatorio de las mentorías confirmadas que empiezan en las
 *    próximas 24 horas y aún no lo recibieron.
 *
 * Protegida con CRON_SECRET (cabecera "Authorization: Bearer <secreto>").
 * Sin CRON_SECRET configurado responde 503.
 */
export async function POST(request: NextRequest) {
  if (!process.env.CRON_SECRET?.trim()) {
    return NextResponse.json({ success: false, error: "CRON_SECRET no está configurado." }, { status: 503 });
  }
  if (!verificarSecretoCron(request.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const exp = await query(
      `UPDATE ciepi.mentoria_reservas SET estado = 'expirada', fecha_actualizacion = NOW()
       WHERE estado = 'pendiente_verificacion' AND pendiente_expira <= NOW()`
    );

    // Se "reservan" las filas antes de enviar: si la tarea corre dos veces a la
    // vez, cada recordatorio sale una sola vez.
    const pendientes = await query(
      `UPDATE ciepi.mentoria_reservas SET recordatorio_enviado_en = NOW()
       WHERE estado = 'confirmada' AND recordatorio_enviado_en IS NULL
         AND inicio > NOW() AND inicio <= NOW() + interval '24 hours'
       RETURNING id`
    );

    let enviados = 0;
    let fallidos = 0;
    for (const { id } of pendientes.rows as { id: number }[]) {
      const r = await cargarReservaCompleta({ id });
      if (!r) continue;
      try {
        await enviarRecordatorio(r);
        enviados++;
      } catch (error) {
        fallidos++;
        console.error(`Recordatorio de mentoría ${id} no enviado; se reintentará:`, error);
        await query(`UPDATE ciepi.mentoria_reservas SET recordatorio_enviado_en = NULL WHERE id = $1`, [id]);
      }
    }

    return NextResponse.json({ success: true, expiradas: exp.rowCount ?? 0, recordatorios: enviados, fallidos });
  } catch (error) {
    console.error("Error en la tarea de recordatorios de mentorías:", error);
    return NextResponse.json({ success: false, error: "Error en la tarea." }, { status: 500 });
  }
}
