"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { withBasePath } from "@/lib/basePath";
import { DIAS_SEMANA_LARGOS } from "@/lib/calendarUtils";
import {
  errorHorario,
  siguienteHorario,
  validarHorarios,
  type HorarioInput,
} from "@/lib/capacitacionDetails";
import ModalRapido, { CampoModal, CAMPO_MODAL } from "@/components/admin/ModalRapido";

type ModalUbicacion = null | "sede" | "edificio" | "aula";
const TIPOS_AULA = [
  ["aula", "Aula"],
  ["laboratorio", "Laboratorio"],
  ["taller", "Taller"],
  ["auditorio", "Auditorio"],
  ["virtual", "Virtual"],
] as const;

/** Botón pequeño "+ Nueva …" junto a cada lista. */
function BotonNuevo({ texto, onClick, disabled }: { texto: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="text-xs font-semibold text-primary hover:underline disabled:opacity-40 disabled:no-underline inline-flex items-center gap-0.5"
    >
      <Icon icon="solar:add-circle-linear" aria-hidden="true" />
      {texto}
    </button>
  );
}

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
  const [modal, setModal] = useState<ModalUbicacion>(null);
  const [nuevo, setNuevo] = useState({ nombre: "", codigo: "", direccion: "", capacidad: "", tipo: "aula" });

  const cargarSedes = async () => {
    try {
      const res = await fetch(withBasePath("/api/admin/sedes"));
      const data = await res.json();
      if (res.ok && data.success) {
        // Se guardan todas: las inactivas solo se muestran si ya están seleccionadas.
        setSedes(data.data || []);
      }
    } catch (err) {
      console.error("Error cargando sedes:", err);
    } finally {
      setLoadingSedes(false);
    }
  };

  useEffect(() => {
    cargarSedes();
  }, []);

  const abrirModal = (tipo: ModalUbicacion) => {
    setNuevo({ nombre: "", codigo: "", direccion: "", capacidad: "", tipo: "aula" });
    setModal(tipo);
  };

  /** Crea la sede, edificio o aula, recarga la lista y la deja seleccionada. */
  const guardarNuevo = async (): Promise<string | null> => {
    if (!nuevo.nombre.trim()) return "Escribe el nombre.";
    const peticiones = {
      sede: { url: "/api/admin/sedes", body: { nombre: nuevo.nombre, codigo: nuevo.codigo, direccion: nuevo.direccion } },
      edificio: { url: "/api/admin/edificios", body: { sede_id: ubicacion.sedeId, nombre: nuevo.nombre } },
      aula: {
        url: "/api/admin/aulas",
        body: { edificio_id: ubicacion.edificioId, nombre: nuevo.nombre, capacidad: nuevo.capacidad || null, tipo: nuevo.tipo },
      },
    };
    const peticion = peticiones[modal!];
    const res = await fetch(withBasePath(peticion.url), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(peticion.body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) return data.error || "No se pudo crear.";
    const id = data.data.id as number;
    await cargarSedes();
    if (modal === "sede") onUbicacionChange({ sedeId: id, edificioId: null, aulaId: null });
    if (modal === "edificio") onUbicacionChange({ ...ubicacion, edificioId: id, aulaId: null });
    if (modal === "aula") onUbicacionChange({ ...ubicacion, aulaId: id });
    setModal(null);
    return null;
  };

  // Las sedes, edificios y aulas inactivos no se ofrecen para asignaciones nuevas,
  // pero el que ya tiene asignado la capacitación se sigue mostrando (marcado).
  const sedesVisibles = sedes.filter((s) => s.activo || s.id === ubicacion.sedeId);
  const selectedSede = sedes.find((s) => s.id === ubicacion.sedeId);
  const edificios = (selectedSede?.edificios || []).filter(
    (e) => e.activo || e.id === ubicacion.edificioId,
  );
  const selectedEdificio = edificios.find((e) => e.id === ubicacion.edificioId);
  const aulas = (selectedEdificio?.aulas || []).filter(
    (a) => a.activo || a.id === ubicacion.aulaId,
  );

  // Mismas reglas que el servidor: se avisa antes de enviar en vez de descartar el bloque.
  const erroresBloque = horarios.map((h, i) => errorHorario(h, i + 1));
  const validacion = erroresBloque.some(Boolean) ? null : validarHorarios(horarios);
  const errorSolape = validacion && !validacion.ok ? validacion.error : null;

  // Cada día nuevo es el siguiente al último, con las mismas horas.
  const addHorario = () => {
    onHorariosChange([...horarios, siguienteHorario(horarios)]);
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
            target="_blank"
            rel="noopener"
            className="text-xs text-primary hover:underline font-semibold"
          >
            Gestionar sedes y aulas (nueva pestaña) &rarr;
          </Link>
        </div>

        {loadingSedes ? (
          <p className="text-sm text-dark_grey dark:text-gray-400">
            Cargando sedes...
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold">Sede</label>
                <BotonNuevo texto="Nueva sede" onClick={() => abrirModal("sede")} />
              </div>
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
                {sedesVisibles.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                    {s.activo ? "" : " (inactiva)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold">Edificio</label>
                <BotonNuevo texto="Nuevo edificio" onClick={() => abrirModal("edificio")} disabled={!ubicacion.sedeId} />
              </div>
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
                    {ed.activo ? "" : " (inactivo)"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold">Aula</label>
                <BotonNuevo texto="Nueva aula" onClick={() => abrirModal("aula")} disabled={!ubicacion.edificioId} />
              </div>
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
                    {au.activo ? "" : " (inactiva)"}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
        {sedesVisibles.length === 0 && !loadingSedes && (
          <p className="text-xs text-dark_grey dark:text-gray-400 mt-2">
            No hay sedes registradas: créala con «Nueva sede».
          </p>
        )}
      </div>

      {modal && (
        <ModalRapido
          titulo={modal === "sede" ? "Nueva sede" : modal === "edificio" ? "Nuevo edificio" : "Nueva aula"}
          descripcion={
            modal === "edificio"
              ? `En la sede ${selectedSede?.nombre ?? ""}`
              : modal === "aula"
                ? `En ${selectedSede?.nombre ?? ""} · ${selectedEdificio?.nombre ?? ""}`
                : "Quedará seleccionada en esta capacitación."
          }
          textoGuardar="Crear y seleccionar"
          onGuardar={guardarNuevo}
          onCerrar={() => setModal(null)}
        >
          <CampoModal etiqueta="Nombre *">
            <input
              value={nuevo.nombre}
              maxLength={150}
              onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })}
              placeholder={modal === "sede" ? "Ej. Sede Central Tocumen" : modal === "edificio" ? "Ej. Edificio A" : "Ej. Salón 101"}
              className={CAMPO_MODAL}
            />
          </CampoModal>
          {modal === "sede" && (
            <>
              <CampoModal etiqueta="Código (opcional)">
                <input value={nuevo.codigo} maxLength={30} onChange={(e) => setNuevo({ ...nuevo, codigo: e.target.value })} placeholder="Ej. TOC" className={CAMPO_MODAL} />
              </CampoModal>
              <CampoModal etiqueta="Dirección (opcional)">
                <input value={nuevo.direccion} onChange={(e) => setNuevo({ ...nuevo, direccion: e.target.value })} className={CAMPO_MODAL} />
              </CampoModal>
            </>
          )}
          {modal === "aula" && (
            <div className="grid grid-cols-2 gap-3">
              <CampoModal etiqueta="Cupos (opcional)">
                <input type="number" min={1} value={nuevo.capacidad} onChange={(e) => setNuevo({ ...nuevo, capacidad: e.target.value })} className={CAMPO_MODAL} />
              </CampoModal>
              <CampoModal etiqueta="Tipo">
                <select value={nuevo.tipo} onChange={(e) => setNuevo({ ...nuevo, tipo: e.target.value })} className={CAMPO_MODAL}>
                  {TIPOS_AULA.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </CampoModal>
            </div>
          )}
        </ModalRapido>
      )}

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
              <div key={idx}>
              <div
                className={`grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-slateGray/50 dark:bg-gray-900/40 p-3 rounded-xl ${
                  erroresBloque[idx] ? "ring-1 ring-red-400" : ""
                }`}
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
              {erroresBloque[idx] && (
                <p role="alert" className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {erroresBloque[idx]}
                </p>
              )}
              </div>
            ))}
            {errorSolape && (
              <p role="alert" className="text-xs text-red-600 dark:text-red-400">
                {errorSolape}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
