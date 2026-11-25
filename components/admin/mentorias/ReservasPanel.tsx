"use client";

import { useCallback, useEffect, useState } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { withBasePath } from "@/lib/basePath";
import GestionReservaModal, { EstadoBadge, fechaHoraPanama, lugarReserva, type ReservaAdmin } from "./GestionReservaModal";

type Vista = "proximas" | "por_cerrar" | "pendientes" | "historial";

const VISTAS: { key: Vista; label: string; ayuda: string }[] = [
  { key: "proximas", label: "Próximas", ayuda: "Mentorías confirmadas que aún no se realizan." },
  { key: "por_cerrar", label: "Por cerrar", ayuda: "Ya pasó la hora: marca si se realizó o si la persona no asistió." },
  { key: "pendientes", label: "Esperando confirmación", ayuda: "La persona aún no confirmó su correo (vencen a los 15 minutos)." },
  { key: "historial", label: "Historial", ayuda: "Realizadas, inasistencias, canceladas y expiradas." },
];

interface Props {
  mentores: { id: number; nombre: string; apellido: string; es_mentor: boolean }[];
}

/** Bandeja de reservas de mentoría con filtros y ventana de gestión. */
export default function ReservasPanel({ mentores }: Props) {
  const [vista, setVista] = useState<Vista>("proximas");
  const [profesor, setProfesor] = useState("");
  const [reservas, setReservas] = useState<ReservaAdmin[]>([]);
  const [conteos, setConteos] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [abierta, setAbierta] = useState<ReservaAdmin | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams({ vista });
      if (profesor) qs.set("profesor_id", profesor);
      const res = await fetch(withBasePath(`/api/admin/mentorias/reservas?${qs}`)).then((r) => r.json());
      if (!res.success) throw new Error(res.error);
      setReservas(res.data);
      setConteos(res.conteos ?? {});
    } catch {
      toast.error("No se pudieron cargar las reservas");
    } finally {
      setLoading(false);
    }
  }, [vista, profesor]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const info = VISTAS.find((v) => v.key === vista)!;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar reservas">
          {VISTAS.map((v) => (
            <button
              key={v.key}
              onClick={() => setVista(v.key)}
              aria-pressed={vista === v.key}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                vista === v.key
                  ? "bg-primary border-primary text-white"
                  : "bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-midnight_text dark:text-gray-200 hover:border-primary"
              }`}
            >
              {v.label}
              {conteos[v.key] > 0 && (
                <span
                  className={`min-w-5 px-1.5 rounded-full text-xs ${
                    vista === v.key ? "bg-white/25" : v.key === "por_cerrar" ? "bg-secondary text-white" : "bg-surface-tint text-primary"
                  }`}
                >
                  {conteos[v.key]}
                </span>
              )}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <span className="font-semibold text-dark_grey dark:text-gray-400">Mentor</span>
          <select
            value={profesor}
            onChange={(e) => setProfesor(e.target.value)}
            className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm"
          >
            <option value="">Todos</option>
            {mentores
              .filter((m) => m.es_mentor)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre} {m.apellido}
                </option>
              ))}
          </select>
        </label>
      </div>
      <p className="text-sm text-dark_grey dark:text-gray-400">{info.ayuda}</p>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-primary/20 border-t-primary" />
          </div>
        ) : reservas.length === 0 ? (
          <p className="p-10 text-center text-dark_grey dark:text-gray-400">No hay reservas en esta vista.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-tint dark:bg-gray-700/50 text-left text-midnight_text dark:text-gray-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Fecha y hora</th>
                <th className="px-5 py-3 font-semibold">Persona</th>
                <th className="px-5 py-3 font-semibold hidden md:table-cell">Mentor</th>
                <th className="px-5 py-3 font-semibold hidden lg:table-cell">Modalidad</th>
                <th className="px-5 py-3 font-semibold">Estado</th>
                <th className="px-5 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {reservas.map((r) => (
                <tr key={r.id} className="hover:bg-slateGray/60 dark:hover:bg-gray-700/40">
                  <td className="px-5 py-3 capitalize font-semibold text-midnight_text dark:text-white whitespace-nowrap">
                    {fechaHoraPanama(r.inicio)}
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-semibold text-midnight_text dark:text-white">{r.nombre}</p>
                    <p className="text-xs text-dark_grey dark:text-gray-400">{r.area ?? "Sin área"}</p>
                  </td>
                  <td className="px-5 py-3 hidden md:table-cell text-dark_grey dark:text-gray-300">{r.mentor}</td>
                  <td className="px-5 py-3 hidden lg:table-cell text-dark_grey dark:text-gray-300">
                    <span className="inline-flex items-center gap-1">
                      <Icon icon={r.modalidad === "virtual" ? "solar:monitor-linear" : "solar:map-point-linear"} aria-hidden="true" />
                      {lugarReserva(r)}
                    </span>
                    {r.modalidad === "virtual" && r.estado === "confirmada" && !r.enlace_reunion && (
                      <span className="block text-xs text-secondary font-semibold">Falta el enlace</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <EstadoBadge estado={r.estado} />
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => setAbierta(r)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-semibold hover:brightness-110"
                    >
                      <Icon icon="solar:pen-new-square-linear" aria-hidden="true" />
                      Gestionar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {abierta && <GestionReservaModal reserva={abierta} onClose={() => setAbierta(null)} onChanged={cargar} />}
    </div>
  );
}
