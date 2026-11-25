"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { withBasePath } from "@/lib/basePath";
import { DIAS_SEMANA_LARGOS } from "@/lib/calendarUtils";
import type { HorarioInput } from "@/lib/capacitacionDetails";

interface AulaItem {
  id: number;
  nombre: string;
  capacidad: number | null;
  tipo: string;
  activo: boolean;
}

interface EdificioItem {
  id: number;
  nombre: string;
  activo: boolean;
  aulas: AulaItem[];
}

interface SedeItem {
  id: number;
  nombre: string;
  activo: boolean;
  edificios: EdificioItem[];
}

export interface UbicacionSelection {
  sedeId: number | null;
  edificioId: number | null;
  aulaId: number | null;
}

interface UbicacionHorariosSelectorProps {
  ubicacion: UbicacionSelection;
  onUbicacionChange: (val: UbicacionSelection) => void;
  horarios: HorarioInput[];
  onHorariosChange: (val: HorarioInput[]) => void;
}

export default function UbicacionHorariosSelector({
  ubicacion,
  onUbicacionChange,
  horarios,
  onHorariosChange,
}: UbicacionHorariosSelectorProps) {
  const [sedes, setSedes] = useState<SedeItem[]>([]);
  const [loadingSedes, setLoadingSedes] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(withBasePath("/api/admin/sedes"));
        const data = await res.json();
        if (res.ok && data.success) {
          setSedes((data.data || []).filter((s: SedeItem) => s.activo));
        }
      } catch (err) {
        console.error("Error cargando sedes:", err);
      } finally {
        setLoadingSedes(false);
      }
    };
    load();
  }, []);

  const selectedSede = sedes.find((s) => s.id === ubicacion.sedeId);
  const edificios = (selectedSede?.edificios || []).filter((e) => e.activo);
  const selectedEdificio = edificios.find((e) => e.id === ubicacion.edificioId);
  const aulas = (selectedEdificio?.aulas || []).filter((a) => a.activo);

  const addHorario = () => {
    onHorariosChange([
      ...horarios,
      { dia_semana: 1, hora_inicio: "18:00", hora_fin: "20:00" },
    ]);
  };

  const updateHorario = (index: number, patch: Partial<HorarioInput>) => {
    const next = horarios.map((h, i) => (i === index ? { ...h, ...patch } : h));
    onHorariosChange(next);
  };

  const removeHorario = (index: number) => {
    onHorariosChange(horarios.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Cascading Sedes -> Edificios -> Aulas */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-midnight_text dark:text-white flex items-center gap-2">
              <Icon icon="solar:buildings-linear" className="text-primary text-xl" />
              Sede, Edificio y Aula (Parametrizado)
            </h2>
            <p className="text-xs text-dark_grey dark:text-gray-400">
              Opcional para cursos presenciales o híbridos. Selecciona en cascada.
            </p>
          </div>
          <Link
            href="/admin/sedes"
            className="text-xs text-primary hover:underline font-semibold"
          >
            Gestionar sedes y aulas &rarr;
          </Link>
        </div>

        {loadingSedes ? (
          <p className="text-sm text-dark_grey dark:text-gray-400">
            Cargando sedes...
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold mb-1">Sede</label>
              <select
                value={ubicacion.sedeId ?? ""}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  onUbicacionChange({
                    sedeId: val,
                    edificioId: null,
                    aulaId: null,
                  });
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
              >
                <option value="">Seleccionar sede...</option>
                {sedes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">
                Edificio
              </label>
              <select
                value={ubicacion.edificioId ?? ""}
                disabled={!ubicacion.sedeId}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  onUbicacionChange({
                    ...ubicacion,
                    edificioId: val,
                    aulaId: null,
                  });
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm disabled:opacity-50"
              >
                <option value="">Seleccionar edificio...</option>
                {edificios.map((ed) => (
                  <option key={ed.id} value={ed.id}>
                    {ed.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1">Aula</label>
              <select
                value={ubicacion.aulaId ?? ""}
                disabled={!ubicacion.edificioId}
                onChange={(e) => {
                  const val = e.target.value ? Number(e.target.value) : null;
                  onUbicacionChange({
                    ...ubicacion,
                    aulaId: val,
                  });
                }}
                className="w-full px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm disabled:opacity-50"
              >
                <option value="">Seleccionar aula...</option>
                {aulas.map((au) => (
                  <option key={au.id} value={au.id}>
                    {au.nombre}
                    {au.capacidad ? ` (${au.capacidad} cupos)` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Structured Weekly Schedule for Calendar */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg font-bold text-midnight_text dark:text-white flex items-center gap-2">
              <Icon icon="solar:clock-circle-linear" className="text-primary text-xl" />
              Horarios de Clases (para el Calendario)
            </h2>
            <p className="text-xs text-dark_grey dark:text-gray-400">
              Agrega los días y horas de clase para que aparezcan en el calendario
              de CIEPI.
            </p>
          </div>
          <button
            type="button"
            onClick={addHorario}
            className="px-3.5 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold flex items-center gap-1.5"
          >
            <Icon icon="solar:add-circle-linear" className="text-base" />
            Agregar día
          </button>
        </div>

        {horarios.length === 0 ? (
          <p className="text-sm text-dark_grey dark:text-gray-400">
            Sin bloques horarios definidos aún. Haz clic en &ldquo;Agregar día&rdquo;.
          </p>
        ) : (
          <div className="space-y-3">
            {horarios.map((h, idx) => (
              <div
                key={idx}
                className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-slateGray/50 dark:bg-gray-900/40 p-3 rounded-xl"
              >
                <div className="sm:col-span-5">
                  <select
                    value={h.dia_semana}
                    onChange={(e) =>
                      updateHorario(idx, { dia_semana: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  >
                    {DIAS_SEMANA_LARGOS.map((nombre, diaIdx) => (
                      <option key={diaIdx} value={diaIdx}>
                        {nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <input
                    type="time"
                    value={h.hora_inicio}
                    onChange={(e) =>
                      updateHorario(idx, { hora_inicio: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  />
                </div>
                <div className="sm:col-span-3">
                  <input
                    type="time"
                    value={h.hora_fin}
                    onChange={(e) =>
                      updateHorario(idx, { hora_fin: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm"
                  />
                </div>
                <div className="sm:col-span-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeHorario(idx)}
                    aria-label="Eliminar horario"
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <Icon icon="solar:trash-bin-trash-linear" className="text-lg" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
