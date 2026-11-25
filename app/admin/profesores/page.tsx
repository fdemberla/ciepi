"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import AdminProtection from "@/components/AdminProtection";
import { withBasePath } from "@/lib/basePath";

interface Profesor {
  id: number;
  nombre: string;
  apellido: string;
  correo: string | null;
  telefono: string | null;
  especialidad: string | null;
  biografia: string | null;
  activo: boolean;
  tiene_cedula?: boolean;
}

const EMPTY_FORM = {
  nombre: "",
  apellido: "",
  cedula: "",
  correo: "",
  telefono: "",
  especialidad: "",
  biografia: "",
  activo: true,
};

export default function AdminProfesoresPage() {
  const [profesores, setProfesores] = useState<Profesor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Profesor | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const fetchProfesores = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(withBasePath("/api/admin/profesores"));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar profesores");
      setProfesores(data.data || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error cargando profesores",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfesores();
  }, [fetchProfesores]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (prof: Profesor) => {
    setEditing(prof);
    setForm({
      nombre: prof.nombre,
      apellido: prof.apellido,
      cedula: "",
      correo: prof.correo || "",
      telefono: prof.telefono || "",
      especialidad: prof.especialidad || "",
      biografia: prof.biografia || "",
      activo: prof.activo,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim() || !form.apellido.trim()) {
      toast.error("Nombre y apellido son obligatorios.");
      return;
    }

    try {
      setSaving(true);
      const url = editing
        ? withBasePath(`/api/admin/profesores/${editing.id}`)
        : withBasePath("/api/admin/profesores");
      const enviar = (extra: Record<string, unknown> = {}) =>
        fetch(url, {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...form, ...extra }),
        });
      let res = await enviar();
      let data = await res.json();
      // Desactivar a un mentor con mentorías pendientes o confirmadas: el servidor
      // las lista y solo las cancela si se confirma explícitamente.
      if (res.status === 409 && data.code === "RESERVAS_ACTIVAS") {
        const n = Array.isArray(data.reservas) ? data.reservas.length : 0;
        if (
          !confirm(
            `${data.error || "Este profesor tiene mentorías activas."}

¿Cancelar ${n} mentoría(s) y avisar por correo a las personas?`,
          )
        ) {
          return;
        }
        res = await enviar({ cancelar_reservas: true });
        data = await res.json();
      }
      if (!res.ok) throw new Error(data.error || "Error al guardar profesor");
      if (Array.isArray(data.avisos)) data.avisos.forEach((a: string) => toast(a));

      toast.success(data.message);
      setModalOpen(false);
      fetchProfesores();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error guardando profesor",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (prof: Profesor) => {
    if (
      !confirm(
        `¿Eliminar al profesor ${prof.nombre} ${prof.apellido}? Se desvinculará de las capacitaciones asignadas.`,
      )
    ) {
      return;
    }
    try {
      const res = await fetch(withBasePath(`/api/admin/profesores/${prof.id}`), {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar profesor");
      toast.success(data.message);
      fetchProfesores();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error eliminando profesor",
      );
    }
  };

  const filtered = profesores.filter((p) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      `${p.nombre} ${p.apellido}`.toLowerCase().includes(q) ||
      (p.especialidad || "").toLowerCase().includes(q) ||
      (p.correo || "").toLowerCase().includes(q)
    );
  });

  return (
    <AdminProtection>
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-10">
        <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-midnight_text dark:text-white">
                Profesores e Instructores
              </h1>
              <p className="text-sm text-dark_grey dark:text-gray-400 mt-1">
                Administra el directorio de profesores para asignarlos a las
                capacitaciones.
              </p>
            </div>
            <button
              onClick={openCreate}
              className="px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors flex items-center gap-2 self-start"
            >
              <Icon icon="solar:user-plus-linear" className="text-lg" />
              Nuevo Profesor
            </button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="mb-4">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre, especialidad o correo..."
                className="w-full sm:w-80 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              />
            </div>

            {loading ? (
              <p className="text-sm text-dark_grey dark:text-gray-400 py-6">
                Cargando profesores...
              </p>
            ) : filtered.length === 0 ? (
              <p className="text-sm text-dark_grey dark:text-gray-400 py-6">
                No hay profesores registrados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase text-dark_grey dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="py-3 pr-4">Nombre</th>
                      <th className="py-3 pr-4">Especialidad</th>
                      <th className="py-3 pr-4">Contacto</th>
                      <th className="py-3 pr-4">Estado</th>
                      <th className="py-3 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filtered.map((p) => (
                      <tr key={p.id}>
                        <td className="py-3 pr-4 font-semibold text-midnight_text dark:text-white">
                          {p.nombre} {p.apellido}
                        </td>
                        <td className="py-3 pr-4 text-dark_grey dark:text-gray-300">
                          {p.especialidad || "—"}
                        </td>
                        <td className="py-3 pr-4 text-dark_grey dark:text-gray-400">
                          <div>{p.correo || "—"}</div>
                          {p.telefono && (
                            <div className="text-xs">{p.telefono}</div>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                              p.activo
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                            }`}
                          >
                            {p.activo ? "Activo" : "Inactivo"}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => openEdit(p)}
                            className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDelete(p)}
                            className="px-3 py-1.5 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 hover:bg-red-100 text-xs font-semibold"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-midnight_text dark:text-white">
                {editing ? "Editar Profesor" : "Nuevo Profesor"}
              </h2>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icon icon="solar:close-circle-linear" className="text-2xl" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">
                  Número de Cédula (referencia interna, confidencial)
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  value={form.cedula}
                  onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                  placeholder={
                    editing?.tiene_cedula
                      ? "Registrada (dejar vacío para mantener)"
                      : "Ej: 8-123-4567"
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.nombre}
                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.apellido}
                    onChange={(e) =>
                      setForm({ ...form, apellido: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Número de Cédula (referencia interna, confidencial)
                </label>
                <input
                  type="password"
                  autoComplete="off"
                  value={form.cedula}
                  onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                  placeholder={
                    editing?.tiene_cedula
                      ? "Registrada (dejar vacío para mantener)"
                      : "Ej: 8-123-4567"
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={(e) => setForm({ ...form, correo: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={(e) =>
                      setForm({ ...form, telefono: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Especialidad / Área
                </label>
                <input
                  type="text"
                  value={form.especialidad}
                  onChange={(e) =>
                    setForm({ ...form, especialidad: e.target.value })
                  }
                  placeholder="Ej: Emprendimiento Digital, Marketing, Finanzas"
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1">
                  Biografía breve
                </label>
                <textarea
                  rows={3}
                  value={form.biografia}
                  onChange={(e) =>
                    setForm({ ...form, biografia: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                />
              </div>

              {editing && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.activo}
                    onChange={(e) =>
                      setForm({ ...form, activo: e.target.checked })
                    }
                  />
                  <span>Profesor activo</span>
                </label>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminProtection>
  );
}
