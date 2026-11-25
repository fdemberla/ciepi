/**
 * Correos del módulo de mentorías. Todo texto dinámico se escapa.
 */
import { escapeHtml } from "@/lib/newsletter";
import { getBaseUrl } from "@/lib/verificationUtils";
import { sendEmail } from "@/lib/smtp";
import {
  MINUTOS_PARA_CONFIRMAR,
  formatoFechaHoraPanama,
  generarIcs,
} from "@/lib/mentoriaSolicitud";
import {
  lugarReserva,
  cargarReservaCompleta,
  type ReservaCompleta,
  type ReservaCanceladaPorMentor,
} from "@/lib/mentoriasServer";

export function urlGestionReserva(token: string): string {
  return `${getBaseUrl()}/mentorias/reserva/${token}`;
}

function plantilla(titulo: string, cuerpoHtml: string, boton?: { href: string; texto: string }) {
  const btn = boton
    ? `<div style="text-align:center;margin:28px 0;">
         <a href="${escapeHtml(boton.href)}" style="display:inline-block;background:#ed7625;color:#ffffff;padding:12px 28px;text-decoration:none;border-radius:9999px;font-weight:bold;">${escapeHtml(boton.texto)}</a>
       </div>`
    : "";
  return `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937;background-color:#f3f4f6;margin:0;padding:24px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
    <div style="background:#004a98;padding:22px;text-align:center;color:#ffffff;border-bottom:4px solid #44a147;">
      <h1 style="margin:0;font-size:22px;">CIEPI &mdash; INADEH</h1>
      <p style="margin:6px 0 0;font-size:13px;opacity:0.9;">Centro de Innovación y Emprendimiento Productivo</p>
    </div>
    <div style="padding:28px;">
      <h2 style="margin-top:0;color:#004a98;font-size:20px;">${escapeHtml(titulo)}</h2>
      ${cuerpoHtml}
      ${btn}
    </div>
  </div>
</body></html>`;
}

function detalleHtml(r: ReservaCompleta): string {
  const filas: [string, string][] = [
    ["Mentor", `${r.mentor_nombre} ${r.mentor_apellido}`],
    ["Fecha y hora", formatoFechaHoraPanama(r.inicio)],
    ["Modalidad", r.modalidad === "virtual" ? "Virtual" : "Presencial"],
    ["Lugar", lugarReserva(r)],
  ];
  if (r.area_nombre) filas.push(["Área", r.area_nombre]);
  return `<table style="width:100%;border-collapse:collapse;font-size:14px;margin:12px 0;">${filas
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 8px;color:#6b7280;width:120px;vertical-align:top;">${escapeHtml(k)}</td><td style="padding:6px 8px;font-weight:bold;">${escapeHtml(v)}</td></tr>`
    )
    .join("")}</table>`;
}

function detalleTexto(r: ReservaCompleta): string {
  return [
    `Mentor: ${r.mentor_nombre} ${r.mentor_apellido}`,
    `Fecha y hora: ${formatoFechaHoraPanama(r.inicio)}`,
    `Modalidad: ${r.modalidad === "virtual" ? "Virtual" : "Presencial"}`,
    `Lugar: ${lugarReserva(r)}`,
    r.area_nombre ? `Área: ${r.area_nombre}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

function icsAdjunto(r: ReservaCompleta, cancelado = false) {
  return {
    filename: "mentoria-ciepi.ics",
    contentType: `text/calendar; charset=utf-8; method=${cancelado ? "CANCEL" : "PUBLISH"}`,
    content: generarIcs({
      uid: `mentoria-${r.id}@ciepi.inadeh.edu.pa`,
      inicio: new Date(r.inicio),
      fin: new Date(r.fin),
      titulo: `Mentoría CIEPI con ${r.mentor_nombre} ${r.mentor_apellido}`,
      descripcion: `Mentoría de CIEPI (INADEH).\n${r.tema ? `Tema: ${r.tema}\n` : ""}${r.enlace_reunion ? `Enlace: ${r.enlace_reunion}` : ""}`,
      ubicacion: lugarReserva(r),
      cancelado,
    }),
  };
}

/** 1) Al solicitar: pide confirmar el correo en MINUTOS_PARA_CONFIRMAR minutos. */
export async function enviarCorreoVerificacion(r: ReservaCompleta, token: string) {
  const url = urlGestionReserva(token);
  await sendEmail({
    to: r.correo,
    subject: "Confirma tu reserva de mentoría — CIEPI",
    text: `Hola ${r.nombre},\n\nRecibimos tu solicitud de mentoría:\n${detalleTexto(r)}\n\nPara confirmarla, abre este enlace y pulsa "Confirmar reserva" en los próximos ${MINUTOS_PARA_CONFIRMAR} minutos:\n${url}\n\nSi no lo confirmas a tiempo, el horario quedará libre para otras personas. Si no hiciste esta solicitud, ignora este correo.`,
    html: plantilla(
      "Confirma tu reserva de mentoría",
      `<p>Hola ${escapeHtml(r.nombre)},</p>
       <p>Recibimos tu solicitud de mentoría:</p>${detalleHtml(r)}
       <p>Para confirmarla, abre el enlace y pulsa <strong>«Confirmar reserva»</strong> en los próximos <strong>${MINUTOS_PARA_CONFIRMAR} minutos</strong>. Si no la confirmas a tiempo, el horario quedará libre para otras personas.</p>
       <p style="font-size:13px;color:#6b7280;">Si no hiciste esta solicitud, ignora este correo.</p>`,
      { href: url, texto: "Ver y confirmar mi reserva" }
    ),
  });
}

/** Correo opcional de CIEPI para recibir copia de las reservas. */
function correoCiepi(): string | null {
  const v = process.env.MENTORIAS_NOTIFY_EMAIL?.trim();
  return v ? v : null;
}

/** 2) Reserva confirmada: al ciudadano (con enlace para cancelar) y aviso al mentor y a CIEPI. */
export async function enviarCorreosConfirmacion(r: ReservaCompleta, token: string) {
  const url = urlGestionReserva(token);
  const envios: Promise<unknown>[] = [
    sendEmail({
      to: r.correo,
      subject: "Tu mentoría está confirmada — CIEPI",
      text: `Hola ${r.nombre},\n\nTu mentoría está confirmada:\n${detalleTexto(r)}\n\nAdjuntamos un archivo para agregarla a tu calendario.\nSi necesitas cancelarla: ${url}`,
      html: plantilla(
        "Tu mentoría está confirmada",
        `<p>Hola ${escapeHtml(r.nombre)},</p><p>Tu mentoría quedó confirmada:</p>${detalleHtml(r)}
         <p>Adjuntamos un archivo para agregarla a tu calendario (Outlook, Google Calendar).${
           r.modalidad === "virtual" ? " El enlace de la reunión te llegará por correo antes de la sesión." : ""
         }</p>
         <p style="font-size:13px;color:#6b7280;">Si no puedes asistir, cancélala desde el enlace para liberar el horario.</p>`,
        { href: url, texto: "Ver o cancelar mi reserva" }
      ),
      attachments: [icsAdjunto(r)],
    }),
  ];

  const aviso = (to: string) =>
    sendEmail({
      to,
      subject: `Nueva mentoría: ${formatoFechaHoraPanama(r.inicio)}`,
      text: `Nueva mentoría confirmada.\n${detalleTexto(r)}\n\nSolicitante: ${r.nombre}\nCorreo: ${r.correo}\nTeléfono: ${r.telefono ?? "-"}\nTema: ${r.tema ?? "-"}`,
      html: plantilla(
        "Nueva mentoría confirmada",
        `${detalleHtml(r)}
         <p><strong>Solicitante:</strong> ${escapeHtml(r.nombre)}<br><strong>Correo:</strong> ${escapeHtml(r.correo)}<br><strong>Teléfono:</strong> ${escapeHtml(r.telefono ?? "-")}</p>
         <p><strong>Tema:</strong><br>${escapeHtml(r.tema ?? "-").replace(/\n/g, "<br>")}</p>
         ${r.modalidad === "virtual" ? "<p>Recuerda enviar el enlace de la reunión al solicitante.</p>" : ""}`
      ),
      attachments: [icsAdjunto(r)],
    });
  if (r.mentor_correo) envios.push(aviso(r.mentor_correo));
  const ciepi = correoCiepi();
  if (ciepi) envios.push(aviso(ciepi));

  const resultados = await Promise.allSettled(envios);
  resultados.forEach((res) => res.status === "rejected" && console.error("Error enviando correo de mentoría:", res.reason));
  if (resultados[0].status === "rejected") throw resultados[0].reason;
}

/** 3) Cancelación por el ciudadano: avisa al mentor y a CIEPI, y confirma al ciudadano. */
export async function enviarCorreosCancelacion(r: ReservaCompleta) {
  const destinos = [r.mentor_correo, correoCiepi()].filter((x): x is string => Boolean(x));
  const envios = [
    sendEmail({
      to: r.correo,
      subject: "Cancelaste tu mentoría — CIEPI",
      text: `Hola ${r.nombre},\n\nCancelaste esta mentoría:\n${detalleTexto(r)}\n\nPuedes reservar otro horario cuando quieras en ${getBaseUrl()}/mentorias`,
      html: plantilla(
        "Mentoría cancelada",
        `<p>Hola ${escapeHtml(r.nombre)},</p><p>Cancelaste esta mentoría:</p>${detalleHtml(r)}`,
        { href: `${getBaseUrl()}/mentorias`, texto: "Reservar otro horario" }
      ),
      attachments: [icsAdjunto(r, true)],
    }),
    ...destinos.map((to) =>
      sendEmail({
        to,
        subject: `Mentoría cancelada: ${formatoFechaHoraPanama(r.inicio)}`,
        text: `El solicitante canceló la mentoría.\n${detalleTexto(r)}\nSolicitante: ${r.nombre} (${r.correo})`,
        html: plantilla(
          "Mentoría cancelada por el solicitante",
          `${detalleHtml(r)}<p><strong>Solicitante:</strong> ${escapeHtml(r.nombre)} (${escapeHtml(r.correo)})</p><p>El horario quedó libre.</p>`
        ),
        attachments: [icsAdjunto(r, true)],
      })
    ),
  ];
  const resultados = await Promise.allSettled(envios);
  resultados.forEach((res) => res.status === "rejected" && console.error("Error enviando correo de cancelación:", res.reason));
}

/**
 * 4) Cancelación por CIEPI: avisa a la persona (con el motivo) y al mentor.
 * Si la reserva estaba solo pendiente, el mentor nunca supo de ella: `avisarMentor: false`.
 */
export async function enviarCorreosCancelacionCiepi(
  r: ReservaCompleta,
  motivo: string | null,
  opciones: { avisarMentor?: boolean } = {}
) {
  const motivoHtml = motivo ? `<p><strong>Motivo:</strong> ${escapeHtml(motivo)}</p>` : "";
  const envios: Promise<unknown>[] = [
    sendEmail({
      to: r.correo,
      subject: "Tu mentoría fue cancelada — CIEPI",
      text: `Hola ${r.nombre},\n\nLamentamos informarte que CIEPI canceló esta mentoría:\n${detalleTexto(r)}\n${motivo ? `\nMotivo: ${motivo}\n` : ""}\nPuedes reservar otro horario en ${getBaseUrl()}/mentorias`,
      html: plantilla(
        "Tu mentoría fue cancelada",
        `<p>Hola ${escapeHtml(r.nombre)},</p><p>Lamentamos informarte que CIEPI canceló esta mentoría:</p>${detalleHtml(r)}${motivoHtml}`,
        { href: `${getBaseUrl()}/mentorias`, texto: "Reservar otro horario" }
      ),
      attachments: [icsAdjunto(r, true)],
    }),
  ];
  if (r.mentor_correo && opciones.avisarMentor !== false) {
    envios.push(
      sendEmail({
        to: r.mentor_correo,
        subject: `Mentoría cancelada por CIEPI: ${formatoFechaHoraPanama(r.inicio)}`,
        text: `CIEPI canceló esta mentoría.\n${detalleTexto(r)}\nSolicitante: ${r.nombre}${motivo ? `\nMotivo: ${motivo}` : ""}`,
        html: plantilla(
          "Mentoría cancelada por CIEPI",
          `${detalleHtml(r)}<p><strong>Solicitante:</strong> ${escapeHtml(r.nombre)}</p>${motivoHtml}`
        ),
        attachments: [icsAdjunto(r, true)],
      })
    );
  }
  const resultados = await Promise.allSettled(envios);
  resultados.forEach((res) => res.status === "rejected" && console.error("Error enviando cancelación de CIEPI:", res.reason));
  if (resultados[0].status === "rejected") throw resultados[0].reason;
}

/**
 * Correos de las reservas canceladas al desactivar un mentor (después del commit).
 * Nunca lanza: devuelve avisos para el admin con las personas a las que no se pudo avisar.
 */
export async function enviarCancelacionesPorMentor(
  canceladas: ReservaCanceladaPorMentor[],
  motivo: string
): Promise<string[]> {
  const fallidas: string[] = [];
  for (const c of canceladas) {
    try {
      const r = await cargarReservaCompleta({ id: c.id });
      if (!r) continue;
      await enviarCorreosCancelacionCiepi(r, motivo, { avisarMentor: c.estadoPrevio === "confirmada" });
    } catch (error) {
      console.error(`No se pudo avisar la cancelación de la reserva de mentoría ${c.id}:`, error);
      fallidas.push(`#${c.id}`);
    }
  }
  return fallidas.length
    ? [`Se cancelaron las reservas, pero no se pudo enviar el correo de ${fallidas.join(", ")}. Avisa a esas personas por teléfono.`]
    : [];
}

/** 5) Enlace de la reunión virtual: a la persona, con el .ics actualizado (mismo UID). */
export async function enviarEnlaceReunion(r: ReservaCompleta) {
  if (!r.enlace_reunion) throw new Error("La reserva no tiene enlace de reunión.");
  await sendEmail({
    to: r.correo,
    cc: r.mentor_correo ?? undefined,
    subject: "Enlace de tu mentoría — CIEPI",
    text: `Hola ${r.nombre},\n\nEste es el enlace para tu mentoría:\n${r.enlace_reunion}\n\n${detalleTexto(r)}`,
    html: plantilla(
      "Enlace de tu mentoría",
      `<p>Hola ${escapeHtml(r.nombre)},</p><p>Te compartimos el enlace para conectarte a tu mentoría:</p>
       <p style="word-break:break-all;"><a href="${escapeHtml(r.enlace_reunion)}">${escapeHtml(r.enlace_reunion)}</a></p>${detalleHtml(r)}`,
      { href: r.enlace_reunion, texto: "Unirme a la reunión" }
    ),
    attachments: [icsAdjunto(r)],
  });
}

/** 6) Recordatorio 24 h antes: a la persona y al mentor. */
export async function enviarRecordatorio(r: ReservaCompleta) {
  const enlaceHtml =
    r.modalidad === "virtual"
      ? r.enlace_reunion
        ? `<p><strong>Enlace de la reunión:</strong> <a href="${escapeHtml(r.enlace_reunion)}">${escapeHtml(r.enlace_reunion)}</a></p>`
        : `<p>El enlace de la reunión te llegará por correo antes de la sesión.</p>`
      : "";
  const enlaceTexto =
    r.modalidad === "virtual"
      ? r.enlace_reunion
        ? `Enlace de la reunión: ${r.enlace_reunion}\n`
        : "El enlace de la reunión te llegará por correo antes de la sesión.\n"
      : "";
  await sendEmail({
    to: r.correo,
    subject: "Recordatorio: tu mentoría es mañana — CIEPI",
    text: `Hola ${r.nombre},\n\nTe recordamos tu mentoría:\n${detalleTexto(r)}\n${enlaceTexto}\nSi no puedes asistir, cancélala con el enlace "Ver o cancelar mi reserva" del correo de confirmación para liberar el horario.`,
    html: plantilla(
      "Tu mentoría es mañana",
      `<p>Hola ${escapeHtml(r.nombre)},</p><p>Te recordamos tu mentoría:</p>${detalleHtml(r)}${enlaceHtml}
       <p style="font-size:13px;color:#6b7280;">Si no puedes asistir, cancélala con el enlace «Ver o cancelar mi reserva» del correo de confirmación, para que otra persona pueda usar el horario.</p>`
    ),
  });
  if (r.mentor_correo) {
    const falta = r.modalidad === "virtual" && !r.enlace_reunion;
    await sendEmail({
      to: r.mentor_correo,
      subject: `Recordatorio: mentoría ${formatoFechaHoraPanama(r.inicio)}`,
      text: `Recordatorio de mentoría.\n${detalleTexto(r)}\nSolicitante: ${r.nombre} (${r.correo})\nTema: ${r.tema ?? "-"}${falta ? "\n\nATENCIÓN: aún no se ha enviado el enlace de la reunión." : ""}`,
      html: plantilla(
        "Recordatorio de mentoría",
        `${detalleHtml(r)}<p><strong>Solicitante:</strong> ${escapeHtml(r.nombre)} (${escapeHtml(r.correo)})</p>
         <p><strong>Tema:</strong><br>${escapeHtml(r.tema ?? "-").replace(/\n/g, "<br>")}</p>
         ${falta ? `<p style="color:#b45309;"><strong>Atención:</strong> aún no se ha enviado el enlace de la reunión. Agrégalo desde el portal (Admin → Mentorías).</p>` : ""}`
      ),
    }).catch((e) => console.error("Error enviando recordatorio al mentor:", e));
  }
}
