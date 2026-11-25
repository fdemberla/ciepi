"use client";
import React, { useState } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";

export interface EstadoInscripcion {
  id: number;
  nombre: string;
  descripcion: string;
}

/** Transición que el servidor permite para esta inscripción y el rol de la sesión. */
export interface TransicionInscripcion {
  a: number;
  accion: string;
  etiqueta: string;
  requiereMotivo: boolean;
  override: boolean;
}

interface EntradaHistorial {
  id: number;
  estado_de_nombre: string | null;
  estado_a_nombre: string;
  accion: string;
  actor_nombre: string | null;
  motivo: string | null;
  es_override: boolean;
  creado_en: string;
}

interface EstadoSelectorProps {
  inscripcionId: number;
  estadoActual: EstadoInscripcion;
  /** Transiciones que devolvió la API; solo se ofrecen estas. */
  transiciones: TransicionInscripcion[];
  /** Catálogo de estados, para mostrar el nombre y la descripción del destino. */
  estadosDisponibles: EstadoInscripcion[];
  onEstadoChange: (
    inscripcionId: number,
    nuevoEstado: EstadoInscripcion,
    transiciones: TransicionInscripcion[]
  ) => void;
  /** Se llama cuando el estado cambió en el servidor (409) para recargar los datos. */
  onConflicto?: () => void;
  disabled?: boolean;
}

const getEstadoColor = (estado: string) => {
  switch (estado.toLowerCase()) {
    case "nueva inscripción":
      return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700";
    case "pendiente de validación":
    case "pendiente":
      return "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700";
    case "matriculado":
      return "bg-success/10 text-success border-success/30";
    case "terminó curso":
      return "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700";
    case "rechazado":
      return "bg-red-100 text-red-800 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700";
    case "retirado":
      return "bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-700";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600";
  }
};

const formatFechaHora = (fecha: string) =>
  new Date(fecha).toLocaleString("es-PA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function EstadoSelector({
  inscripcionId,
  estadoActual,
  transiciones,
  estadosDisponibles,
  onEstadoChange,
  onConflicto,
  disabled = false,
}: EstadoSelectorProps) {
  const [isChanging, setIsChanging] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [seleccion, setSeleccion] = useState<number | null>(null);
  const [motivo, setMotivo] = useState("");
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [historial, setHistorial] = useState<EntradaHistorial[] | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const transicionSeleccionada = transiciones.find((t) => t.a === seleccion) ?? null;
  const faltaMotivo = Boolean(transicionSeleccionada?.requiereMotivo && !motivo.trim());

  const handleOpenModal = () => {
    setSeleccion(null);
    setMotivo("");
    setErrorServidor(null);
    setHistorial(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (isChanging) return;
    setShowModal(false);
  };

  const cargarHistorial = async () => {
    setCargandoHistorial(true);
    try {
      const response = await fetch(`${basePath}/api/admin/inscripciones/${inscripcionId}`);
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.success) {
        throw new Error(result?.error || "No se pudo cargar el historial");
      }
      setHistorial(result.data.historial ?? []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo cargar el historial");
    } finally {
      setCargandoHistorial(false);
    }
  };

  const handleConfirmarCambio = async () => {
    if (!transicionSeleccionada || disabled || faltaMotivo) return;

    setIsChanging(true);
    setErrorServidor(null);

    try {
      const response = await fetch(`${basePath}/api/admin/inscripciones/${inscripcionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estado_inscripcion: transicionSeleccionada.a,
          estado_actual: estadoActual.id,
          motivo: motivo.trim() || undefined,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.success) {
        const mensaje = result?.error || "No se pudo actualizar el estado";
        setErrorServidor(mensaje);
        toast.error(mensaje);
        if (response.status === 409) {
          // Otra persona cambió el estado: recargar para ver el actual.
          setShowModal(false);
          onConflicto?.();
        }
        return;
      }

      const nuevoEstado: EstadoInscripcion = result.data.estado ?? {
        id: transicionSeleccionada.a,
        nombre:
          estadosDisponibles.find((e) => e.id === transicionSeleccionada.a)?.nombre ??
          transicionSeleccionada.etiqueta,
        descripcion: "",
      };
      onEstadoChange(inscripcionId, nuevoEstado, result.data.transiciones ?? []);
      toast.success(`Estado actualizado a "${nuevoEstado.nombre}"`);
      setShowModal(false);
    } catch (error) {
      console.error("Error actualizando estado:", error);
      const mensaje = "No se pudo conectar con el servidor. Inténtalo de nuevo.";
      setErrorServidor(mensaje);
      toast.error(mensaje);
    } finally {
      setIsChanging(false);
    }
  };

  if (disabled) {
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-semibold border ${getEstadoColor(
          estadoActual.nombre
        )}`}
      >
        {estadoActual.nombre}
      </span>
    );
  }

  return (
    <>
      <button
        onClick={handleOpenModal}
        disabled={isChanging}
        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all duration-200 ${getEstadoColor(
          estadoActual.nombre
        )} ${
          isChanging
            ? "opacity-50 cursor-not-allowed"
            : "hover:shadow-md cursor-pointer"
        }`}
        title={
          transiciones.length > 0
            ? "Haz clic para cambiar el estado"
            : "Haz clic para ver el historial"
        }
      >
        <div className="flex items-center gap-1">
          {isChanging ? (
            <Icon
              icon="solar:loading-line-duotone"
              className="w-3 h-3 animate-spin"
            />
          ) : (
            <Icon
              icon={transiciones.length > 0 ? "solar:pen-2-linear" : "solar:history-linear"}
              className="w-3 h-3"
            />
          )}
          {estadoActual.nombre}
        </div>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={`estado-inscripcion-${inscripcionId}`}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-auto max-h-[90vh] overflow-y-auto"
          >
            {/* Header del modal */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3
                  id={`estado-inscripcion-${inscripcionId}`}
                  className="text-lg font-bold text-midnight_text dark:text-white"
                >
                  Cambiar Estado de Inscripción
                </h3>
                <button
                  type="button"
                  onClick={handleCloseModal}
                  aria-label="Cerrar modal"
                  className="text-dark_grey dark:text-gray-400 hover:text-midnight_text dark:hover:text-white transition-colors"
                >
                  <Icon
                    icon="solar:close-circle-linear"
                    className="w-6 h-6"
                    aria-hidden="true"
                  />
                </button>
              </div>
              <p className="text-sm text-dark_grey dark:text-gray-400 mt-2">
                Estado actual:{" "}
                <span className="font-medium">{estadoActual.nombre}</span>
              </p>
            </div>

            {/* Contenido del modal */}
            <div className="p-6 space-y-4">
              {transiciones.length === 0 ? (
                <p className="text-sm text-dark_grey dark:text-gray-400">
                  No hay cambios de estado disponibles para tu rol desde este estado.
                </p>
              ) : (
                <div className="space-y-3">
                  {transiciones.map((t) => {
                    const destino = estadosDisponibles.find((e) => e.id === t.a);
                    const activa = seleccion === t.a;
                    return (
                      <label
                        key={t.a}
                        className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          activa
                            ? "border-primary bg-primary/5 dark:bg-primary/10"
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`estado-${inscripcionId}`}
                          value={t.a}
                          checked={activa}
                          onChange={() => {
                            setSeleccion(t.a);
                            setErrorServidor(null);
                          }}
                          className="mt-1 text-primary focus:ring-primary"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-midnight_text dark:text-white">
                              {t.etiqueta}
                            </span>
                            {t.override && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                                Excepción de administrador
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-dark_grey dark:text-gray-400 mt-1">
                            Pasa a «{destino?.nombre ?? t.a}»
                            {destino?.descripcion ? `: ${destino.descripcion}` : ""}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}

              {transicionSeleccionada?.requiereMotivo && (
                <div>
                  <label
                    htmlFor={`motivo-${inscripcionId}`}
                    className="block text-sm font-medium text-midnight_text dark:text-white mb-1"
                  >
                    Motivo <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    id={`motivo-${inscripcionId}`}
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    maxLength={500}
                    rows={3}
                    className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-midnight_text dark:text-white p-2 text-sm focus:ring-primary focus:border-primary"
                    placeholder="Explica por qué se hace este cambio (queda en el historial)"
                  />
                </div>
              )}

              {errorServidor && (
                <p role="alert" className="text-sm text-red-600 dark:text-red-400">
                  {errorServidor}
                </p>
              )}

              {/* Historial */}
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                {historial === null ? (
                  <button
                    type="button"
                    onClick={cargarHistorial}
                    disabled={cargandoHistorial}
                    className="text-sm text-primary hover:underline flex items-center gap-1 disabled:opacity-50"
                  >
                    <Icon
                      icon={cargandoHistorial ? "solar:loading-line-duotone" : "solar:history-linear"}
                      className={`w-4 h-4 ${cargandoHistorial ? "animate-spin" : ""}`}
                    />
                    Ver historial
                  </button>
                ) : historial.length === 0 ? (
                  <p className="text-sm text-dark_grey dark:text-gray-400">
                    Sin cambios registrados todavía.
                  </p>
                ) : (
                  <ol className="space-y-2">
                    {historial.map((h) => (
                      <li key={h.id} className="text-sm">
                        <p className="text-midnight_text dark:text-white">
                          {h.estado_de_nombre ? `${h.estado_de_nombre} → ` : ""}
                          <span className="font-medium">{h.estado_a_nombre}</span>
                          {h.es_override && (
                            <span className="ml-1 text-xs text-amber-700 dark:text-amber-300">
                              (excepción)
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-dark_grey dark:text-gray-400">
                          {formatFechaHora(h.creado_en)}
                          {h.actor_nombre ? ` · ${h.actor_nombre}` : ""}
                        </p>
                        {h.motivo && (
                          <p className="text-xs text-dark_grey dark:text-gray-400 italic">
                            Motivo: {h.motivo}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            </div>

            {/* Footer del modal */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCloseModal}
                  disabled={isChanging}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-600 text-midnight_text dark:text-white rounded-lg hover:bg-slateGray dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {transiciones.length === 0 ? "Cerrar" : "Cancelar"}
                </button>
                {transiciones.length > 0 && (
                  <button
                    onClick={handleConfirmarCambio}
                    disabled={isChanging || !transicionSeleccionada || faltaMotivo}
                    className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isChanging ? (
                      <>
                        <Icon
                          icon="solar:loading-line-duotone"
                          className="w-4 h-4 animate-spin"
                        />
                        Actualizando...
                      </>
                    ) : (
                      <>
                        <Icon
                          icon="solar:check-circle-bold"
                          className="w-4 h-4"
                        />
                        Confirmar Cambio
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
