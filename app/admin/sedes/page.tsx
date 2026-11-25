"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import AdminProtection from "@/components/AdminProtection";
import { withBasePath } from "@/lib/basePath";

interface Aula {
  id: number;
  edificio_id: number;
  nombre: string;
  capacidad: number | null;
  tipo: string;
  activo: boolean;
}

interface Edificio {
  id: number;
  sede_id: number;
  nombre: string;
  codigo: string | null;
  activo: boolean;
  aulas: Aula[];
}

interface Sede {
  id: number;
  nombre: string;
  codigo: string | null;
  direccion: string | null;
  telefono: string | null;
  activo: boolean;
  edificios: Edificio[];
}

/** Etiqueta «Inactivo»: no se ofrece en asignaciones nuevas, pero se conserva donde ya se usa. */
function BadgeInactivo() {
  return (
    <span className="ml-2 text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
      Inactivo
    </span>
  );
}

export default function AdminSedesPage() {
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [loading, setLoading] = useState(true);

  const [newSede, setNewSede] = useState({ nombre: "", codigo: "", direccion: "" });
  const [newEdificioBySede, setNewEdificioBySede] = useState<Record<number, string>>({});
  const [newAulaByEdificio, setNewAulaByEdificio] = useState<
    Record<number, { nombre: string; capacidad: string; tipo: string }>
  >({});

  const fetchSedes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(withBasePath("/api/admin/sedes"));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar sedes");
      setSedes(data.data || []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error cargando sedes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSedes();
  }, [fetchSedes]);

  const handleCreateSede = async (e: FormEvent) => {
    e.preventDefault();
    if (!newSede.nombre.trim()) return;
    try {
      const res = await fetch(withBasePath("/api/admin/sedes"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSede),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear sede");
      toast.success("Sede creada");
      setNewSede({ nombre: "", codigo: "", direccion: "" });
      fetchSedes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear sede");
    }
  };

  const handleCreateEdificio = async (sedeId: number) => {
    const nombre = (newEdificioBySede[sedeId] || "").trim();
    if (!nombre) return;
    try {
      const res = await fetch(withBasePath("/api/admin/edificios"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sede_id: sedeId, nombre }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear edificio");
      toast.success("Edificio agregado");
      setNewEdificioBySede({ ...newEdificioBySede, [sedeId]: "" });
      fetchSedes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear edificio");
    }
  };

  const handleCreateAula = async (edificioId: number) => {
    const draft = newAulaByEdificio[edificioId] || {
      nombre: "",
      capacidad: "",
      tipo: "aula",
    };
    if (!draft.nombre.trim()) return;
    try {
      const res = await fetch(withBasePath("/api/admin/aulas"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          edificio_id: edificioId,
          nombre: draft.nombre.trim(),
          capacidad: draft.capacidad ? Number(draft.capacidad) : null,
          tipo: draft.tipo,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al crear aula");
      toast.success("Aula agregada");
      setNewAulaByEdificio({
        ...newAulaByEdificio,
        [edificioId]: { nombre: "", capacidad: "", tipo: "aula" },
      });
      fetchSedes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al crear aula");
    }
  };

  /**
   * Activa o desactiva una sede, edificio o aula. Desactivar no toca las capacitaciones
   * ni las reservas que ya la usan: solo deja de ofrecerse para asignaciones nuevas.
   */
  const handleToggleActivo = async (endpoint: string, body: Record<string, unknown>) => {
    try {
      const res = await fetch(withBasePath(endpoint), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Error al actualizar");
      toast.success(body.activo ? "Activado" : "Desactivado");
      fetchSedes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al actualizar");
    }
  };

  const handleDelete = async (
    endpoint: string,
    confirmMsg: string,
  ) => {
    if (!confirm(confirmMsg)) return;
    try {
      const res = await fetch(withBasePath(endpoint), { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      // 409: está en uso (capacitaciones, horarios o reservas). El mensaje explica
      // cuántas y recomienda desactivar.
      if (!res.ok) throw new Error(data.error || "Error al eliminar");
      toast.success(data.message || "Eliminado");
      fetchSedes();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al eliminar");
    }
  };

  return (
    <AdminProtection>
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-10">
        <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-midnight_text dark:text-white">
              Sedes, Edificios y Aulas
            </h1>
            <p className="text-sm text-dark_grey dark:text-gray-400 mt-1">
              Parametriza las sedes de CIEPI, sus edificios y las aulas
              disponibles para asignarlas a las capacitaciones.
            </p>
          </div>

          {/* Nueva Sede */}
          <form
            onSubmit={handleCreateSede}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <h2 className="text-lg font-bold text-midnight_text dark:text-white mb-4 flex items-center gap-2">
              <Icon icon="solar:add-circle-linear" className="text-primary text-xl" />
              Agregar Nueva Sede
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <input
                type="text"
                required
                value={newSede.nombre}
                onChange={(e) => setNewSede({ ...newSede, nombre: e.target.value })}
                placeholder="Nombre de la sede (ej. Sede Central Tocumen)"
                className="sm:col-span-4 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              />
              <input
                type="text"
                value={newSede.codigo}
                onChange={(e) => setNewSede({ ...newSede, codigo: e.target.value })}
                placeholder="Código (ej. TOC)"
                className="sm:col-span-2 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              />
              <input
                type="text"
                value={newSede.direccion}
                onChange={(e) =>
                  setNewSede({ ...newSede, direccion: e.target.value })
                }
                placeholder="Dirección (opcional)"
                className="sm:col-span-4 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              />
              <button
                type="submit"
                className="sm:col-span-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90"
              >
                Crear Sede
              </button>
            </div>
          </form>

          {/* Listado jerárquico */}
          {loading ? (
            <p className="text-sm text-dark_grey dark:text-gray-400">
              Cargando sedes...
            </p>
          ) : sedes.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 text-center text-sm text-dark_grey dark:text-gray-400">
              No hay sedes registradas todavía. Crea la primera arriba.
            </div>
          ) : (
            <div className="space-y-6">
              {sedes.map((sede) => (
                <div
                  key={sede.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700 pb-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon
                          icon="solar:buildings-2-linear"
                          className="text-primary text-xl"
                        />
                        <h3 className="text-xl font-bold text-midnight_text dark:text-white">
                          {sede.nombre}
                        </h3>
                        {sede.codigo && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">
                            {sede.codigo}
                          </span>
                        )}
                        {!sede.activo && <BadgeInactivo />}
                      </div>
                      {sede.direccion && (
                        <p className="text-xs text-dark_grey dark:text-gray-400 mt-1">
                          {sede.direccion}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleActivo(`/api/admin/sedes/${sede.id}`, {
                            nombre: sede.nombre,
                            codigo: sede.codigo,
                            direccion: sede.direccion,
                            telefono: sede.telefono,
                            activo: !sede.activo,
                          })
                        }
                        className="text-xs text-primary hover:underline font-semibold"
                      >
                        {sede.activo ? "Desactivar sede" : "Activar sede"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(
                            `/api/admin/sedes/${sede.id}`,
                            `¿Eliminar la sede "${sede.nombre}" con todos sus edificios y aulas? Si está en uso no se eliminará; en ese caso desactívala.`,
                          )
                        }
                        className="text-xs text-red-600 hover:underline font-semibold"
                      >
                        Eliminar sede
                      </button>
                    </div>
                  </div>

                  {/* Agregar edificio */}
                  <div className="flex flex-col sm:flex-row gap-2 mb-5">
                    <input
                      type="text"
                      value={newEdificioBySede[sede.id] || ""}
                      onChange={(e) =>
                        setNewEdificioBySede({
                          ...newEdificioBySede,
                          [sede.id]: e.target.value,
                        })
                      }
                      placeholder="Nuevo edificio en esta sede (ej. Edificio A)"
                      className="flex-1 px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateEdificio(sede.id)}
                      className="px-4 py-2 rounded-xl bg-gray-900 dark:bg-gray-700 text-white text-xs font-semibold hover:opacity-90"
                    >
                      + Agregar Edificio
                    </button>
                  </div>

                  {/* Edificios */}
                  {sede.edificios.length === 0 ? (
                    <p className="text-xs text-dark_grey dark:text-gray-400">
                      Sin edificios registrados.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {sede.edificios.map((ed) => {
                        const aulaDraft = newAulaByEdificio[ed.id] || {
                          nombre: "",
                          capacidad: "",
                          tipo: "aula",
                        };
                        return (
                          <div
                            key={ed.id}
                            className="bg-slateGray/60 dark:bg-gray-900/40 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="font-bold text-midnight_text dark:text-white flex items-center gap-1.5">
                                <Icon
                                  icon="solar:buildings-linear"
                                  className="text-primary"
                                />
                                {ed.nombre}
                                {!ed.activo && <BadgeInactivo />}
                              </h4>
                              <div className="flex items-center gap-3">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleActivo(`/api/admin/edificios/${ed.id}`, {
                                      nombre: ed.nombre,
                                      codigo: ed.codigo,
                                      activo: !ed.activo,
                                    })
                                  }
                                  className="text-xs text-primary hover:underline"
                                >
                                  {ed.activo ? "Desactivar" : "Activar"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleDelete(
                                      `/api/admin/edificios/${ed.id}`,
                                      `¿Eliminar el edificio "${ed.nombre}" con sus aulas?`,
                                    )
                                  }
                                  className="text-xs text-red-600 hover:underline"
                                >
                                  Eliminar
                                </button>
                              </div>
                            </div>

                            {/* Aulas list */}
                            <div className="space-y-1.5 mb-3">
                              {ed.aulas.length === 0 ? (
                                <p className="text-xs text-gray-500">
                                  Sin aulas registradas.
                                </p>
                              ) : (
                                ed.aulas.map((aula) => (
                                  <div
                                    key={aula.id}
                                    className="flex items-center justify-between bg-white dark:bg-gray-800 px-3 py-1.5 rounded-lg text-xs border border-gray-200 dark:border-gray-700"
                                  >
                                    <div>
                                      <span className="font-semibold text-midnight_text dark:text-white">
                                        {aula.nombre}
                                      </span>
                                      <span className="text-gray-500 ml-2">
                                        {aula.tipo}
                                        {aula.capacidad
                                          ? ` · ${aula.capacidad} cupos`
                                          : ""}
                                      </span>
                                      {!aula.activo && <BadgeInactivo />}
                                    </div>
                                    <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleToggleActivo(`/api/admin/aulas/${aula.id}`, {
                                          nombre: aula.nombre,
                                          capacidad: aula.capacidad,
                                          tipo: aula.tipo,
                                          activo: !aula.activo,
                                        })
                                      }
                                      className="text-primary hover:underline"
                                    >
                                      {aula.activo ? "Desactivar" : "Activar"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDelete(
                                          `/api/admin/aulas/${aula.id}`,
                                          `¿Eliminar aula "${aula.nombre}"?`,
                                        )
                                      }
                                      className="text-red-500 hover:text-red-700"
                                      aria-label={`Eliminar aula ${aula.nombre}`}
                                    >
                                      <Icon icon="solar:trash-bin-trash-linear" />
                                    </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>

                            {/* Add Aula */}
                            <div className="flex flex-wrap gap-2">
                              <input
                                type="text"
                                value={aulaDraft.nombre}
                                onChange={(e) =>
                                  setNewAulaByEdificio({
                                    ...newAulaByEdificio,
                                    [ed.id]: { ...aulaDraft, nombre: e.target.value },
                                  })
                                }
                                placeholder="Aula (ej. Salón 101)"
                                className="flex-1 min-w-[120px] px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs"
                              />
                              <input
                                type="number"
                                min={1}
                                value={aulaDraft.capacidad}
                                onChange={(e) =>
                                  setNewAulaByEdificio({
                                    ...newAulaByEdificio,
                                    [ed.id]: {
                                      ...aulaDraft,
                                      capacidad: e.target.value,
                                    },
                                  })
                                }
                                placeholder="Cupos"
                                className="w-20 px-2.5 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs"
                              />
                              <select
                                value={aulaDraft.tipo}
                                onChange={(e) =>
                                  setNewAulaByEdificio({
                                    ...newAulaByEdificio,
                                    [ed.id]: { ...aulaDraft, tipo: e.target.value },
                                  })
                                }
                                className="px-2 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-xs"
                              >
                                <option value="aula">Aula</option>
                                <option value="laboratorio">Laboratorio</option>
                                <option value="taller">Taller</option>
                                <option value="auditorio">Auditorio</option>
                                <option value="virtual">Virtual</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleCreateAula(ed.id)}
                                className="px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary/90"
                              >
                                + Aula
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminProtection>
  );
}
