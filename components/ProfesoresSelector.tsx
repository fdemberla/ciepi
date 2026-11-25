"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { withBasePath } from "@/lib/basePath";
import ModalRapido, { CampoModal, CAMPO_MODAL } from "@/components/admin/ModalRapido";

interface ProfesorOption {
  id: number;
  nombre: string;
  apellido: string;
  especialidad: string | null;
}

interface ProfesoresSelectorProps {
  selectedIds: number[];
  onChange: (ids: number[]) => void;
}

export default function ProfesoresSelector({
  selectedIds,
  onChange,
}: ProfesoresSelectorProps) {
  const [profesores, setProfesores] = useState<ProfesorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [creando, setCreando] = useState(false);
  const vacio = { nombre: "", apellido: "", correo: "", telefono: "", especialidad: "" };
  const [nuevo, setNuevo] = useState(vacio);

  const cargar = async () => {
    try {
      const res = await fetch(withBasePath("/api/admin/profesores?activo=true"));
      const data = await res.json();
      if (res.ok && data.success) {
        setProfesores(data.data || []);
      }
    } catch (err) {
      console.error("Error cargando profesores:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargar();
  }, []);

  /** Crea el profesor, recarga la lista y lo deja marcado en esta capacitación. */
  const guardarNuevo = async (): Promise<string | null> => {
    if (!nuevo.nombre.trim() || !nuevo.apellido.trim()) return "Nombre y apellido son obligatorios.";
    const res = await fetch(withBasePath("/api/admin/profesores"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...nuevo, activo: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) return data.error || "No se pudo crear el profesor.";
    await cargar();
    onChange([...selectedIds, data.data.id as number]);
    setCreando(false);
    return null;
  };

  const toggle = (id: number) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-midnight_text dark:text-white flex items-center gap-2">
            <Icon icon="solar:user-id-linear" className="text-primary text-xl" />
            Profesores Asignados
          </h2>
          <p className="text-xs text-dark_grey dark:text-gray-400">
            Selecciona uno o más instructores para esta capacitación.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => {
              setNuevo(vacio);
              setCreando(true);
            }}
            className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-0.5"
          >
            <Icon icon="solar:add-circle-linear" aria-hidden="true" />
            Nuevo profesor
          </button>
          <Link
            href="/admin/profesores"
            target="_blank"
            rel="noopener"
            className="text-xs text-primary hover:underline font-semibold"
          >
            Gestionar profesores (nueva pestaña) &rarr;
          </Link>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-dark_grey dark:text-gray-400">
          Cargando lista de profesores...
        </p>
      ) : profesores.length === 0 ? (
        <p className="text-sm text-dark_grey dark:text-gray-400">
          No hay profesores activos registrados todavía: créalo con «Nuevo profesor».
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {profesores.map((prof) => {
            const checked = selectedIds.includes(prof.id);
            return (
              <label
                key={prof.id}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                  checked
                    ? "border-primary bg-primary/5 dark:bg-primary/15"
                    : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(prof.id)}
                  className="mt-1 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <div className="text-sm">
                  <div className="font-semibold text-midnight_text dark:text-white">
                    {prof.nombre} {prof.apellido}
                  </div>
                  {prof.especialidad && (
                    <div className="text-xs text-dark_grey dark:text-gray-400">
                      {prof.especialidad}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>
      )}

      {creando && (
        <ModalRapido
          titulo="Nuevo profesor"
          descripcion="Quedará asignado a esta capacitación. Los demás datos se completan después en Profesores."
          textoGuardar="Crear y asignar"
          onGuardar={guardarNuevo}
          onCerrar={() => setCreando(false)}
        >
          <div className="grid grid-cols-2 gap-3">
            <CampoModal etiqueta="Nombre *">
              <input value={nuevo.nombre} maxLength={120} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} className={CAMPO_MODAL} />
            </CampoModal>
            <CampoModal etiqueta="Apellido *">
              <input value={nuevo.apellido} maxLength={120} onChange={(e) => setNuevo({ ...nuevo, apellido: e.target.value })} className={CAMPO_MODAL} />
            </CampoModal>
          </div>
          <CampoModal etiqueta="Especialidad / Área">
            <input value={nuevo.especialidad} maxLength={200} onChange={(e) => setNuevo({ ...nuevo, especialidad: e.target.value })} placeholder="Ej. Marketing Digital" className={CAMPO_MODAL} />
          </CampoModal>
          <div className="grid grid-cols-2 gap-3">
            <CampoModal etiqueta="Correo">
              <input type="email" value={nuevo.correo} maxLength={255} onChange={(e) => setNuevo({ ...nuevo, correo: e.target.value })} className={CAMPO_MODAL} />
            </CampoModal>
            <CampoModal etiqueta="Teléfono">
              <input type="tel" value={nuevo.telefono} maxLength={50} onChange={(e) => setNuevo({ ...nuevo, telefono: e.target.value })} className={CAMPO_MODAL} />
            </CampoModal>
          </div>
        </ModalRapido>
      )}
    </div>
  );
}
