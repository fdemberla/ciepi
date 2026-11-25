"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import AdminProtection from "@/components/AdminProtection";
import { withBasePath, assetUrl } from "@/lib/basePath";
import ReservasPanel from "@/components/admin/mentorias/ReservasPanel";
import AgendaPanel from "@/components/admin/mentorias/AgendaPanel";

interface MentorRow {
  id: number;
  nombre: string;
  apellido: string;
  especialidad: string | null;
  activo: boolean;
  es_mentor: boolean;
  foto: string | null;
  duracion_mentoria_min: number;
  areas: string[];
  bloques: number;
}

interface Area {
  id: number;
  nombre: string;
  activo: boolean;
  mentores: number;
}

type Tab = "reservas" | "agenda" | "mentores" | "areas";

export default function MentoriasAdminPage() {
  const [tab, setTab] = useState<Tab>("reservas");
  const [mentores, setMentores] = useState<MentorRow[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevaArea, setNuevaArea] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [m, a] = await Promise.all([
        fetch(withBasePath("/api/admin/mentorias/mentores")).then((r) => r.json()),
        fetch(withBasePath("/api/admin/mentorias/areas")).then((r) => r.json()),
      ]);
      if (!m.success || !a.success) throw new Error(m.error || a.error);
      setMentores(m.data);
      setAreas(a.data);
    } catch {
      toast.error("No se pudieron cargar los datos de mentorías");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const crearArea = async (e: FormEvent) => {
    e.preventDefault();
    const res = await fetch(withBasePath("/api/admin/mentorias/areas"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: nuevaArea }),
    }).then((r) => r.json());
    if (!res.success) return toast.error(res.error || "No se pudo crear el área");
    toast.success("Área creada");
    setNuevaArea("");
    setAreas((prev) => [...prev, res.data]);
  };

  const actualizarArea = async (area: Area, cambios: Partial<Pick<Area, "nombre" | "activo">>) => {
    const res = await fetch(withBasePath(`/api/admin/mentorias/areas/${area.id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cambios),
    }).then((r) => r.json());
    if (!res.success) return toast.error(res.error || "No se pudo actualizar el área");
    setAreas((prev) => prev.map((a) => (a.id === area.id ? { ...a, ...res.data } : a)));
  };

  const renombrar = (area: Area) => {
    const nombre = window.prompt("Nuevo nombre del área", area.nombre);
    if (nombre && nombre.trim() && nombre.trim() !== area.nombre) actualizarArea(area, { nombre: nombre.trim() });
  };

  const totalMentores = mentores.filter((m) => m.es_mentor).length;

  return (
    <AdminProtection>
      <div className="min-h-screen bg-slateGray dark:bg-gray-900">
        <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 py-10">
          <div className="mb-8">
            <span aria-hidden="true" className="block w-12 h-1.5 rounded-full bg-brand-green mb-3" />
            <h1 className="text-3xl md:text-4xl font-bold text-primary dark:text-white">Mentorías</h1>
            <p className="text-dark_grey dark:text-gray-400 mt-2">
              Gestiona las reservas, consulta la agenda y configura a los mentores, sus áreas y su horario semanal.
            </p>
          </div>

          <div role="tablist" className="flex flex-wrap gap-2 mb-6">
            {(
              [
                ["reservas", "Reservas", "solar:clipboard-list-linear"],
                ["agenda", "Agenda", "solar:calendar-linear"],
                ["mentores", `Mentores (${totalMentores})`, "solar:users-group-rounded-linear"],
                ["areas", `Áreas de mentoría (${areas.filter((a) => a.activo).length})`, "solar:tag-linear"],
              ] as const
            ).map(([key, label, icon]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  tab === key
                    ? "bg-primary text-white"
                    : "bg-white dark:bg-gray-800 text-midnight_text dark:text-gray-200 hover:text-primary"
                }`}
              >
                <Icon icon={icon} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>

          {tab === "reservas" ? (
            <ReservasPanel mentores={mentores} />
          ) : tab === "agenda" ? (
            <AgendaPanel />
          ) : loading ? (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary" />
            </div>
          ) : tab === "mentores" ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700 overflow-hidden">
              {mentores.length === 0 ? (
                <div className="p-10 text-center text-dark_grey dark:text-gray-400">
                  No hay profesores activos.{" "}
                  <Link href="/admin/profesores" className="text-primary font-semibold hover:underline">
                    Registra profesores
                  </Link>{" "}
                  para poder activarlos como mentores.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-surface-tint dark:bg-gray-700/50 text-left text-midnight_text dark:text-gray-200">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Profesor</th>
                      <th className="px-5 py-3 font-semibold">Mentor</th>
                      <th className="px-5 py-3 font-semibold hidden md:table-cell">Áreas</th>
                      <th className="px-5 py-3 font-semibold hidden md:table-cell">Horario</th>
                      <th className="px-5 py-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {mentores.map((m) => (
                      <tr key={m.id} className="hover:bg-slateGray/60 dark:hover:bg-gray-700/40">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            {m.foto ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={assetUrl(m.foto)} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <span className="w-10 h-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                                {m.nombre.charAt(0)}
                                {m.apellido.charAt(0)}
                              </span>
                            )}
                            <div>
                              <p className="font-semibold text-midnight_text dark:text-white">
                                {m.nombre} {m.apellido}
                              </p>
                              <p className="text-xs text-dark_grey dark:text-gray-400">{m.especialidad || "—"}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          {m.es_mentor ? (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-brand-green/15 text-green-800 dark:text-green-300">
                              Sí · {m.duracion_mentoria_min} min
                            </span>
                          ) : (
                            <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-dark_grey dark:text-gray-300">
                              No
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell text-dark_grey dark:text-gray-300">
                          {m.areas.length ? m.areas.join(", ") : "—"}
                        </td>
                        <td className="px-5 py-3 hidden md:table-cell text-dark_grey dark:text-gray-300">
                          {m.bloques ? `${m.bloques} bloque${m.bloques === 1 ? "" : "s"} por semana` : "Sin horario"}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Link
                            href={`/admin/mentorias/mentores/${m.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-white text-xs font-semibold hover:brightness-110"
                          >
                            <Icon icon="solar:settings-linear" aria-hidden="true" />
                            Configurar
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200/80 dark:border-gray-700 p-6">
              <form onSubmit={crearArea} className="flex flex-col sm:flex-row gap-3 mb-6">
                <label htmlFor="nueva-area" className="sr-only">
                  Nueva área
                </label>
                <input
                  id="nueva-area"
                  value={nuevaArea}
                  onChange={(e) => setNuevaArea(e.target.value)}
                  maxLength={120}
                  placeholder="Nueva área (ej. Exportación)"
                  className="flex-1 h-11 px-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={!nuevaArea.trim()}
                  className="h-11 px-5 rounded-full bg-primary text-white text-sm font-semibold disabled:opacity-50"
                >
                  Agregar área
                </button>
              </form>
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {areas.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <p className={`font-semibold ${a.activo ? "text-midnight_text dark:text-white" : "text-dark_grey line-through"}`}>
                        {a.nombre}
                      </p>
                      <p className="text-xs text-dark_grey dark:text-gray-400">
                        {a.mentores} mentor{a.mentores === 1 ? "" : "es"}
                        {!a.activo && " · inactiva (no se ofrece al público)"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => renombrar(a)}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-tint dark:bg-gray-700 text-primary dark:text-white"
                      >
                        Renombrar
                      </button>
                      <button
                        onClick={() => actualizarArea(a, { activo: !a.activo })}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold border border-gray-300 dark:border-gray-600 text-midnight_text dark:text-gray-200"
                      >
                        {a.activo ? "Desactivar" : "Activar"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </AdminProtection>
  );
}
