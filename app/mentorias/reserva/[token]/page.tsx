"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import { withBasePath } from "@/lib/basePath";

interface Reserva {
  estado: string;
  nombre: string;
  correo: string;
  mentor: string;
  inicio: string;
  modalidad: string;
  lugar: string;
  area: string | null;
  pendiente_expira: string | null;
  puede_cancelar: boolean;
}

const ESTADOS: Record<string, { titulo: string; icono: string; color: string }> = {
  pendiente_verificacion: { titulo: "Falta confirmar tu reserva", icono: "solar:hourglass-linear", color: "text-secondary bg-secondary/10" },
  confirmada: { titulo: "Tu mentoría está confirmada", icono: "solar:check-circle-linear", color: "text-brand-green bg-brand-green/15" },
  expirada: { titulo: "La reserva venció", icono: "solar:clock-circle-linear", color: "text-dark_grey bg-gray-100" },
  cancelada_usuario: { titulo: "Cancelaste esta mentoría", icono: "solar:close-circle-linear", color: "text-dark_grey bg-gray-100" },
  cancelada_ciepi: { titulo: "CIEPI canceló esta mentoría", icono: "solar:close-circle-linear", color: "text-dark_grey bg-gray-100" },
  completada: { titulo: "Mentoría realizada", icono: "solar:medal-ribbon-linear", color: "text-primary bg-primary/10" },
  no_asistio: { titulo: "Mentoría no realizada", icono: "solar:user-cross-linear", color: "text-dark_grey bg-gray-100" },
};

const fechaHora = (iso: string) =>
  new Date(iso).toLocaleString("es-PA", {
    timeZone: "America/Panama",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/** Página del enlace del correo: ver, confirmar o cancelar una reserva. */
export default function GestionReservaPage() {
  const { token } = useParams<{ token: string }>();
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trabajando, setTrabajando] = useState(false);

  useEffect(() => {
    fetch(withBasePath(`/api/mentorias/reservas/gestion?token=${encodeURIComponent(token)}`))
      .then((r) => r.json())
      .then((d) => (d.success ? setReserva(d.data) : setError(d.error || "El enlace no es válido.")))
      .catch(() => setError("No se pudo cargar la reserva."))
      .finally(() => setLoading(false));
  }, [token]);

  const accion = async (tipo: "confirmar" | "cancelar") => {
    if (tipo === "cancelar" && !window.confirm("¿Seguro que quieres cancelar esta mentoría? El horario quedará libre.")) return;
    setTrabajando(true);
    setError(null);
    try {
      const d = await fetch(withBasePath("/api/mentorias/reservas/gestion"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, accion: tipo }),
      }).then((r) => r.json());
      if (d.success) setReserva(d.data);
      else {
        setError(d.error || "No se pudo completar la acción.");
        if (tipo === "confirmar") setReserva((r) => r && { ...r, estado: "expirada" });
      }
    } catch {
      setError("No se pudo conectar. Intenta de nuevo.");
    } finally {
      setTrabajando(false);
    }
  };

  const info = reserva ? ESTADOS[reserva.estado] ?? ESTADOS.expirada : null;

  return (
    <div className="bg-slateGray dark:bg-gray-900 min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-xl w-full bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-8">
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary" />
          </div>
        ) : !reserva || !info ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary dark:text-white">Enlace no válido</h1>
            <p className="mt-2 text-dark_grey dark:text-gray-300">{error}</p>
            <Link href="/mentorias" className="inline-block mt-6 text-primary font-semibold hover:underline">
              Ir a mentorías
            </Link>
          </div>
        ) : (
          <>
            <div className="text-center">
              <span className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4 ${info.color}`}>
                <Icon icon={info.icono} className="text-4xl" aria-hidden="true" />
              </span>
              <h1 className="text-3xl font-bold text-primary dark:text-white">{info.titulo}</h1>
              {reserva.nombre && <p className="mt-1 text-dark_grey dark:text-gray-400">Hola, {reserva.nombre}</p>}
            </div>

            <dl className="mt-6 divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              {[
                ["Mentor", reserva.mentor],
                ["Fecha y hora", fechaHora(reserva.inicio)],
                ["Modalidad", reserva.modalidad === "virtual" ? "Virtual" : "Presencial"],
                ["Lugar", reserva.lugar],
                ...(reserva.area ? [["Área", reserva.area]] : []),
                ["Correo", reserva.correo],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-4 py-2.5">
                  <dt className="w-28 flex-shrink-0 text-dark_grey dark:text-gray-400">{k}</dt>
                  <dd className="font-semibold text-midnight_text dark:text-white">{v}</dd>
                </div>
              ))}
            </dl>

            {error && (
              <p role="alert" className="mt-5 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-4 py-3 text-sm">
                {error}
              </p>
            )}

            <div className="mt-6 flex flex-col items-center gap-3">
              {reserva.estado === "pendiente_verificacion" && (
                <button
                  onClick={() => accion("confirmar")}
                  disabled={trabajando}
                  className="inline-flex items-center gap-2 rounded-full bg-secondary text-white font-semibold px-8 py-3 hover:brightness-95 disabled:opacity-60"
                >
                  <Icon icon="solar:check-circle-linear" aria-hidden="true" />
                  {trabajando ? "Confirmando..." : "Confirmar reserva"}
                </button>
              )}
              {reserva.estado === "confirmada" && (
                <p className="text-sm text-center text-dark_grey dark:text-gray-300">
                  Te enviamos los detalles por correo, con un archivo para agregarla a tu calendario.
                </p>
              )}
              {reserva.puede_cancelar && (
                <button onClick={() => accion("cancelar")} disabled={trabajando} className="text-sm font-semibold text-red-600 hover:underline disabled:opacity-60">
                  Cancelar mentoría
                </button>
              )}
              {["expirada", "cancelada_usuario", "cancelada_ciepi"].includes(reserva.estado) && (
                <Link href="/mentorias" className="inline-flex items-center gap-2 rounded-full bg-primary text-white font-semibold px-7 py-3">
                  Reservar otro horario
                  <Icon icon="solar:arrow-right-linear" aria-hidden="true" />
                </Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
