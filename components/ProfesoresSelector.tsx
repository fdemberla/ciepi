"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { withBasePath } from "@/lib/basePath";

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

  useEffect(() => {
    const load = async () => {
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
    load();
  }, []);

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
        <Link
          href="/admin/profesores"
          className="text-xs text-primary hover:underline font-semibold"
        >
          Gestionar profesores &rarr;
        </Link>
      </div>

      {loading ? (
        <p className="text-sm text-dark_grey dark:text-gray-400">
          Cargando lista de profesores...
        </p>
      ) : profesores.length === 0 ? (
        <p className="text-sm text-dark_grey dark:text-gray-400">
          No hay profesores activos registrados todavía.
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
    </div>
  );
}
