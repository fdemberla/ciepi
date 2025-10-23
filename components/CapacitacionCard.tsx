"use client";
import Image from "next/image";
import { Icon } from "@iconify/react";

interface Capacitacion {
  id: number;
  banner: string | null;
  nombre: string;
  cantidad_horas: number | null;
  cantidad_participantes: number | null;
  fecha_inicio_inscripcion: string | null;
  fecha_final_inscripcion: string | null;
  fecha_inicio_capacitacion: string | null;
  fecha_final_capacitacion: string | null;
}

interface CapacitacionCardProps {
  capacitacion: Capacitacion;
  onVerMas: (id: number) => void;
  basePath?: string;
}

const CapacitacionCard = ({
  capacitacion,
  onVerMas,
  basePath = "",
}: CapacitacionCardProps) => {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No especificada";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-PA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group hover:-translate-y-2 dark:shadow-gray-700">
      {/* Banner Image */}
      {capacitacion.banner ? (
        <div className="relative h-56 w-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
          <Image
            src={`${basePath}${capacitacion.banner}`}
            alt={capacitacion.nombre}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="h-56 w-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center">
          <Icon
            icon="solar:diploma-verified-linear"
            className="text-white text-8xl opacity-40"
          />
        </div>
      )}

      {/* Card Content */}
      <div className="p-7">
        <h2 className="text-xl font-bold text-midnight_text dark:text-white mb-4 line-clamp-2 group-hover:text-primary dark:group-hover:text-blue-200 transition-colors">
          {capacitacion.nombre}
        </h2>

        {/* Info Grid */}
        <div className="space-y-3 mb-5">
          {capacitacion.cantidad_horas && (
            <div className="flex items-center text-sm text-dark_grey dark:text-gray-400">
              <div className="w-9 h-9 rounded-full bg-slateGray dark:bg-gray-700 flex items-center justify-center mr-3">
                <Icon
                  icon="solar:clock-circle-linear"
                  className="w-5 h-5 text-primary dark:text-blue-100"
                />
              </div>
              <span className="font-medium">
                {capacitacion.cantidad_horas} hora
                {capacitacion.cantidad_horas !== 1 ? "s" : ""}
              </span>
            </div>
          )}

          {capacitacion.cantidad_participantes && (
            <div className="flex items-center text-sm text-dark_grey dark:text-gray-400">
              <div className="w-9 h-9 rounded-full bg-slateGray dark:bg-gray-700 flex items-center justify-center mr-3">
                <Icon
                  icon="solar:users-group-rounded-linear"
                  className="w-5 h-5 text-primary dark:text-blue-100"
                />
              </div>
              <span className="font-medium">
                Cupos disponibles: {capacitacion.cantidad_participantes}
              </span>
            </div>
          )}
        </div>

        {/* Dates Section */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-5 mb-6">
          <div className="space-y-3 text-sm">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Icon
                  icon="solar:calendar-mark-linear"
                  className="w-4 h-4 text-success"
                />
                <span className="font-bold text-midnight_text dark:text-white">
                  Inscripción:
                </span>
              </div>
              <p className="text-dark_grey dark:text-gray-400 ml-6">
                {formatDate(capacitacion.fecha_inicio_inscripcion)} -{" "}
                {formatDate(capacitacion.fecha_final_inscripcion)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Icon
                  icon="solar:calendar-linear"
                  className="w-4 h-4 text-primary"
                />
                <span className="font-bold text-midnight_text dark:text-white">
                  Capacitación:
                </span>
              </div>
              <p className="text-dark_grey dark:text-gray-400 ml-6">
                {formatDate(capacitacion.fecha_inicio_capacitacion)} -{" "}
                {formatDate(capacitacion.fecha_final_capacitacion)}
              </p>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={() => onVerMas(capacitacion.id)}
          className="w-full bg-primary text-white py-4 px-6 rounded-full hover:bg-primary/90 focus:outline-none focus:ring-4 focus:ring-[#1A21BC]/20 transition-all duration-300 font-semibold text-base shadow-lg group-hover:shadow-xl"
        >
          Más Información
          <Icon
            icon="solar:arrow-right-linear"
            className="w-5 h-5 inline-block ml-2 group-hover:translate-x-1 transition-transform"
          />
        </button>
      </div>
    </div>
  );
};

export default CapacitacionCard;
