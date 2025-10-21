"use client";
import React, { useState } from "react";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";

interface EstadoInscripcion {
  id: number;
  nombre: string;
  descripcion: string;
}

interface EstadoSelectorProps {
  inscripcionId: number;
  estadoActual: EstadoInscripcion;
  estadosDisponibles: EstadoInscripcion[];
  onEstadoChange: (
    inscripcionId: number,
    nuevoEstado: EstadoInscripcion
  ) => void;
  disabled?: boolean;
}

const getEstadoColor = (estado: string) => {
  switch (estado.toLowerCase()) {
    case "nueva inscripción":
      return "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700";
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

export default function EstadoSelector({
  inscripcionId,
  estadoActual,
  estadosDisponibles,
  onEstadoChange,
  disabled = false,
}: EstadoSelectorProps) {
  const [isChanging, setIsChanging] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedEstadoId, setSelectedEstadoId] = useState<number>(
    estadoActual.id
  );

  const handleOpenModal = () => {
    setSelectedEstadoId(estadoActual.id);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedEstadoId(estadoActual.id);
  };

  const handleConfirmarCambio = async () => {
    if (selectedEstadoId === estadoActual.id || disabled) {
      setShowModal(false);
      return;
    }

    const nuevoEstado = estadosDisponibles.find(
      (e) => e.id === selectedEstadoId
    );
    if (!nuevoEstado) return;

    setIsChanging(true);

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(
        `${basePath}/api/admin/inscripciones/${inscripcionId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            estado_inscripcion: selectedEstadoId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Error al actualizar el estado");
      }

      const result = await response.json();

      if (result.success) {
        onEstadoChange(inscripcionId, nuevoEstado);
        toast.success(`Estado actualizado a "${nuevoEstado.nombre}"`);
        setShowModal(false);
      } else {
        throw new Error(result.error || "Error al actualizar");
      }
    } catch (error) {
      console.error("Error actualizando estado:", error);
      toast.error("Error al actualizar el estado");
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
        title="Haz clic para cambiar el estado"
      >
        <div className="flex items-center gap-1">
          {isChanging ? (
            <Icon
              icon="solar:loading-line-duotone"
              className="w-3 h-3 animate-spin"
            />
          ) : (
            <Icon icon="solar:pen-2-linear" className="w-3 h-3" />
          )}
          {estadoActual.nombre}
        </div>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-auto">
            {/* Header del modal */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-midnight_text dark:text-white">
                  Cambiar Estado de Inscripción
                </h3>
                <button
                  onClick={handleCloseModal}
                  className="text-dark_grey dark:text-gray-400 hover:text-midnight_text dark:hover:text-white transition-colors"
                >
                  <Icon icon="solar:close-circle-linear" className="w-6 h-6" />
                </button>
              </div>
              <p className="text-sm text-dark_grey dark:text-gray-400 mt-2">
                Estado actual:{" "}
                <span className="font-medium">{estadoActual.nombre}</span>
              </p>
            </div>

            {/* Contenido del modal */}
            <div className="p-6">
              <div className="space-y-3">
                {estadosDisponibles.map((estado) => (
                  <label
                    key={estado.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedEstadoId === estado.id
                        ? "border-primary bg-primary/5 dark:bg-primary/10"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="estado"
                      value={estado.id}
                      checked={selectedEstadoId === estado.id}
                      onChange={() => setSelectedEstadoId(estado.id)}
                      className="mt-1 text-primary focus:ring-primary"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-midnight_text dark:text-white">
                          {estado.nombre}
                        </span>
                        {selectedEstadoId === estado.id && (
                          <Icon
                            icon="solar:check-circle-bold"
                            className="w-4 h-4 text-primary"
                          />
                        )}
                      </div>
                      <p className="text-sm text-dark_grey dark:text-gray-400 mt-1">
                        {estado.descripcion}
                      </p>
                    </div>
                  </label>
                ))}
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
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmarCambio}
                  disabled={isChanging || selectedEstadoId === estadoActual.id}
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
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
