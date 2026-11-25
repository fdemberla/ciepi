import { NextRequest, NextResponse } from "next/server";
import { withTransaction } from "@/lib/db";
import { verificarSecretoCron } from "@/lib/cronAuth";
import { cargarReservaCompleta, expirarPendientesVencidas } from "@/lib/mentoriasServer";
import { enviarRecordatorio } from "@/lib/mentoriasEmails";

export const dynamic = "force-dynamic";

/** Tope de recordatorios por ejecución (la tarea corre cada hora). */
const MAX_POR_EJECUCION = 200;

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
    const expiradas = await withTransaction((q) => expirarPendientesVencidas(q, { actorDescripcion: "cron" }));

    // Recordatorios, de a uno: cada reserva se toma con FOR UPDATE SKIP LOCKED dentro de
    // una transacción que se mantiene abierta mientras se envía el correo, y solo se
    // marca recordatorio_enviado_en si el envío salió bien.
    // - Dos ejecuciones simultáneas no toman la misma fila (SKIP LOCKED).
    // - Si el proceso se cae a mitad, la transacción se revierte y la fila se reintenta
    //   en la próxima hora: ningún recordatorio se pierde.
    // - Se vuelve a comprobar estado = 'confirmada' y que el mentor siga activo en el
    //   mismo SELECT que bloquea la fila.
    let enviados = 0;
    const fallidos: number[] = [];
    for (let i = 0; i < MAX_POR_EJECUCION; i++) {
      const resultado = await withTransaction(async (q) => {
        const fila = await q(
          `SELECT r.id FROM ciepi.mentoria_reservas r
             JOIN ciepi.profesores p ON p.id = r.profesor_id AND p.activo = true AND p.es_mentor = true
            WHERE r.estado = 'confirmada' AND r.recordatorio_enviado_en IS NULL
              AND r.inicio > NOW() AND r.inicio <= NOW() + interval '24 hours'
              AND NOT (r.id = ANY($1::int[]))
            ORDER BY r.inicio
            LIMIT 1
            FOR UPDATE OF r SKIP LOCKED`,
          [fallidos]
        );
        if (fila.rowCount === 0) return "fin" as const;
        const id = fila.rows[0].id as number;
        const r = await cargarReservaCompleta({ id }, q);
        if (!r) return "fin" as const;
        try {
          await enviarRecordatorio(r);
        } catch (error) {
          console.error(`Recordatorio de mentoría ${id} no enviado; se reintentará:`, error);
          fallidos.push(id);
          return "fallido" as const;
        }
        await q(`UPDATE ciepi.mentoria_reservas SET recordatorio_enviado_en = NOW() WHERE id = $1`, [id]);
        return "enviado" as const;
      });
      if (resultado === "fin") break;
      if (resultado === "enviado") enviados++;
    }

    return NextResponse.json({ success: true, expiradas, recordatorios: enviados, fallidos: fallidos.length });
  } catch (error) {
    console.error("Error en la tarea de recordatorios de mentorías:", error);
    return NextResponse.json({ success: false, error: "Error en la tarea." }, { status: 500 });
  }
}