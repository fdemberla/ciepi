"use client";

import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { withBasePath } from "@/lib/basePath";
import { ETIQUETA_ESTADO_RESERVA, type EstadoReserva } from "@/lib/mentorias";
import type { TransicionDisponible } from "@/lib/estados/comun";

export interface ReservaAdmin {
  id: number;
  profesor_id: number;
  inicio: string;
  fin: string;
  modalidad: "presencial" | "virtual";
  estado: EstadoReserva;
  nombre: string;
  correo: string;
  telefono: string | null;
  tema: string | null;
  enlace_reunion: string | null;
  notas_admin: string | null;
  mentor: string;
  area: string | null;
  sede: string | null;
  aula: string | null;
  /** Transiciones que el servidor permite ahora (la UI no calcula ninguna). */
  transiciones: TransicionDisponible<EstadoReserva>[];
}

interface EntradaHistorial {
  id: number;
  estado_de: string | null;
  estado_a: string;
  accion: string;
  actor_tipo: "admin" | "ciudadano" | "sistema";
  actor_nombre: string | null;
  motivo: string | null;
  es_override: boolean;
  creado_en: string;
}

const ACTOR: Record<EntradaHistorial["actor_tipo"], string> = {
  admin: "CIEPI",
  ciudadano: "La persona",
  sistema: "Sistema",
};

export const COLOR_ESTADO: Record<EstadoReserva, string> = {
  pendiente_verificacion: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  confirmada: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  completada: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  no_asistio: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  cancelada_usuario: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  cancelada_ciepi: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  expirada: "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200",
};

export const fechaHoraPanama = (iso: string) =>
  new Date(iso).toLocaleString("es-PA", {
    timeZone: "America/Panama",
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export const lugarReserva = (r: Pick<ReservaAdmin, "modalidad" | "sede" | "aula">) =>
  r.modalidad === "virtual" ? "Virtual" : [r.sede, r.aula].filter(Boolean).join(" · ") || "Presencial";

export function EstadoBadge({ estado }: { estado: EstadoReserva }) {
  return (
    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${COLOR_ESTADO[estado] ?? ""}`}>
      {ETIQUETA_ESTADO_RESERVA[estado] ?? estado}
    </span>
  );
}

/** Estilo del botón según el destino; el texto viene del servidor (etiqueta). */
const ESTILO_DESTINO: Partial<Record<EstadoReserva, { icono: string; clase: string }>> = {
  completada: { icono: "solar:check-circle-linear", clase: "bg-brand-green text-white" },
  no_asistio: { icono: "solar:user-cross-linear", clase: "bg-amber-500 text-white" },
  cancelada_ciepi: {
    icono: "solar:close-circle-linear",
    clase:
      "border border-red-300 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20",
  },
};
const ESTILO_POR_DEFECTO = { icono: "solar:arrow-right-linear", clase: "bg-surface-tint dark:bg-gray-700 text-primary dark:text-white" };

const INPUT =
  "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-midnight_text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

interface Props {
  reserva: ReservaAdmin;
  onClose: () => void;
  onChanged: () => void;
}

/** Ventana para gestionar una reserva: notas, enlace de la reunión y cambio de estado. */
export default function GestionReservaModal({ reserva: r, onClose, onChanged }: Props) {
  const [notas, setNotas] = useState(r.notas_admin ?? "");
  const [enlace, setEnlace] = useState(r.enlace_reunion ?? "");
  const [motivo, setMotivo] = useState("");
  /** Transición que espera un motivo antes de enviarse. */
  const [pidiendoMotivo, setPidiendoMotivo] = useState<TransicionDisponible<EstadoReserva> | null>(null);
  const [trabajando, setTrabajando] = useState(false);
  const [historial, setHistorial] = useState<EntradaHistorial[] | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let vigente = true;
    fetch(withBasePath(`/api/admin/mentorias/reservas/${r.id}`))
      .then((x) => x.json())
      .then((d) => vigente && setHistorial(d.success ? d.data.historial : []))
      .catch(() => vigente && setHistorial([]));
    return () => {
      vigente = false;
    };
  }, [r.id]);

  const ejecutar = async (t: TransicionDisponible<EstadoReserva>, conMotivo?: string) => {
    const body: Record<string, unknown> = { estado: t.a };
    if (conMotivo) body.motivo = conMotivo;
    if (await enviar(body, `Reserva: ${ETIQUETA_ESTADO_RESERVA[t.a] ?? t.a}`)) onClose();
  };

  const enviar = async (body: Record<string, unknown>, exito: string) => {
    setTrabajando(true);
    try {
      const res = await fetch(withBasePath(`/api/admin/mentorias/reservas/${r.id}`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((x) => x.json());
      if (!res.success) {
        toast.error(res.error || "No se pudo actualizar la reserva");
        return false;
      }
      toast.success(exito);
      (res.avisos ?? []).forEach((a: string) => toast(a, { icon: "⚠️", duration: 7000 }));
      onChanged();
      return true;
    } catch {
      toast.error("No se pudo conectar");
      return false;
    } finally {
      setTrabajando(false);
    }
  };

  const puedeEnlace = r.modalidad === "virtual" && ["confirmada", "pendiente_verificacion"].includes(r.estado);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="gestion-reserva-titulo"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 p-6 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 id="gestion-reserva-titulo" className="text-2xl font-bold text-primary dark:text-white">
              Reserva #{r.id}
            </h2>
            <p className="text-sm text-dark_grey dark:text-gray-400 capitalize">{fechaHoraPanama(r.inicio)}</p>
          </div>
          <div className="flex items-center gap-3">
            <EstadoBadge estado={r.estado} />
            <button onClick={onClose} aria-label="Cerrar" className="text-dark_grey hover:text-midnight_text dark:hover:text-white">
              <Icon icon="solar:close-circle-linear" className="text-2xl" />
            </button>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              ["Mentor", r.mentor],
              ["Modalidad y lugar", lugarReserva(r)],
              ["Persona", r.nombre],
              ["Área", r.area ?? "Sin especificar"],
              ["Correo", r.correo],
              ["Teléfono", r.telefono ?? "—"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="text-dark_grey dark:text-gray-400">{k}</dt>
                <dd className="font-semibold text-midnight_text dark:text-white break-words">{v}</dd>
              </div>
            ))}
            <div className="sm:col-span-2">
              <dt className="text-dark_grey dark:text-gray-400">Qué quiere trabajar</dt>
              <dd className="text-midnight_text dark:text-white whitespace-pre-line">{r.tema || "—"}</dd>
            </div>
          </dl>

          {puedeEnlace && (
            <div>
              <label htmlFor="enlace-reunion" className="text-sm font-semibold text-midnight_text dark:text-white">
                Enlace de la reunión (Microsoft Teams u otro)
              </label>
              <input
                id="enlace-reunion"
                type="url"
                inputMode="url"
                placeholder="https://teams.microsoft.com/..."
                value={enlace}
                onChange={(e) => setEnlace(e.target.value)}
                className={`${INPUT} mt-1`}
              />
              <div className="flex flex-wrap gap-2 mt-2">
                <button
                  disabled={trabajando}
                  onClick={() => enviar({ enlace_reunion: enlace }, "Enlace guardado")}
                  className="px-4 py-2 rounded-full text-sm font-semibold bg-surface-tint dark:bg-gray-700 text-primary dark:text-white disabled:opacity-50"
                >
                  Guardar
                </button>
                <button
                  disabled={trabajando || !enlace.trim() || r.estado !== "confirmada"}
                  onClick={() => enviar({ enlace_reunion: enlace, enviar_enlace: true }, "Enlace enviado a la persona")}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold bg-primary text-white disabled:opacity-50"
                >
                  <Icon icon="solar:letter-linear" aria-hidden="true" />
                  Guardar y enviar a la persona
                </button>
              </div>
              <p className="text-xs text-dark_grey dark:text-gray-400 mt-1">
                Se envía con copia al mentor y con el evento de calendario actualizado.
              </p>
            </div>
          )}

          <div>
            <label htmlFor="notas-admin" className="text-sm font-semibold text-midnight_text dark:text-white">
              Notas internas
            </label>
            <textarea
              id="notas-admin"
              rows={3}
              maxLength={2000}
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Solo las ve el equipo de CIEPI."
              className={`${INPUT} mt-1`}
            />
            <button
              disabled={trabajando || notas === (r.notas_admin ?? "")}
              onClick={() => enviar({ notas_admin: notas }, "Notas guardadas")}
              className="mt-2 px-4 py-2 rounded-full text-sm font-semibold bg-surface-tint dark:bg-gray-700 text-primary dark:text-white disabled:opacity-50"
            >
              Guardar notas
            </button>
          </div>

          {r.transiciones.length > 0 && (
            <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
              <p className="text-sm font-semibold text-midnight_text dark:text-white mb-3">Cambiar estado</p>
              <div className="flex flex-wrap gap-2">
                {r.transiciones.map((t) => {
                  const estilo = ESTILO_DESTINO[t.a] ?? ESTILO_POR_DEFECTO;
                  if (pidiendoMotivo?.a === t.a) return null;
                  return (
                    <button
                      key={`${t.accion}-${t.a}`}
                      disabled={trabajando}
                      onClick={() => {
                        if (t.requiereMotivo) {
                          setMotivo("");
                          setPidiendoMotivo(t);
                        } else {
                          ejecutar(t);
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold disabled:opacity-50 ${estilo.clase}`}
                    >
                      <Icon icon={estilo.icono} aria-hidden="true" />
                      {t.etiqueta}
                    </button>
                  );
                })}
              </div>
              {pidiendoMotivo && (
                <div
                  className={`mt-3 rounded-xl border p-4 ${
                    pidiendoMotivo.a === "cancelada_ciepi"
                      ? "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20"
                      : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30"
                  }`}
                >
                  <label htmlFor="motivo-transicion" className="text-sm font-semibold text-midnight_text dark:text-white">
                    {pidiendoMotivo.a === "cancelada_ciepi"
                      ? "Motivo (se enviará a la persona por correo)"
                      : "Motivo de la corrección (queda en el historial)"}
                  </label>
                  <textarea
                    id="motivo-transicion"
                    rows={2}
                    maxLength={500}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    placeholder={
                      pidiendoMotivo.a === "cancelada_ciepi"
                        ? "Ej.: El mentor tuvo un imprevisto. Puedes reservar otro horario."
                        : "Ej.: Se marcó por error."
                    }
                    className={`${INPUT} mt-1`}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      disabled={trabajando || !motivo.trim()}
                      onClick={() => ejecutar(pidiendoMotivo, motivo.trim())}
                      className={`px-4 py-2 rounded-full text-sm font-semibold text-white disabled:opacity-50 ${
                        pidiendoMotivo.a === "cancelada_ciepi" ? "bg-red-600" : "bg-primary"
                      }`}
                    >
                      Confirmar: {pidiendoMotivo.etiqueta.toLowerCase()}
                    </button>
                    <button onClick={() => setPidiendoMotivo(null)} className="px-4 py-2 rounded-full text-sm font-semibold text-dark_grey">
                      Volver
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="border-t border-gray-100 dark:border-gray-700 pt-5">
            <p className="text-sm font-semibold text-midnight_text dark:text-white mb-3">Historial</p>
            {historial === null ? (
              <p className="text-sm text-dark_grey dark:text-gray-400">Cargando...</p>
            ) : historial.length === 0 ? (
              <p className="text-sm text-dark_grey dark:text-gray-400">Sin cambios registrados.</p>
            ) : (
              <ol className="flex flex-col gap-2 text-sm">
                {historial.map((h) => (
                  <li key={h.id} className="flex flex-col">
                    <span className="text-midnight_text dark:text-white">
                      <span className="font-semibold">
                        {h.estado_de
                          ? `${ETIQUETA_ESTADO_RESERVA[h.estado_de as EstadoReserva] ?? h.estado_de} → `
                          : "Creada: "}
                        {ETIQUETA_ESTADO_RESERVA[h.estado_a as EstadoReserva] ?? h.estado_a}
                      </span>
                      {h.es_override && " (corrección)"}
                    </span>
                    <span className="text-xs text-dark_grey dark:text-gray-400">
                      {fechaHoraPanama(h.creado_en)} · {ACTOR[h.actor_tipo] ?? h.actor_tipo}
                      {h.actor_nombre ? ` (${h.actor_nombre})` : ""}
                    </span>
                    {h.motivo && <span className="text-xs text-dark_grey dark:text-gray-300">Motivo: {h.motivo}</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
