"use client";
import Image from "next/image";
import { Icon } from "@iconify/react";
import EventoCountdown from "./EventoCountdown";

interface Evento {
  id: number;
  nombre: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
  ubicacion?: string;
  banner?: string;
  galeria?: unknown;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface EventoCardProps {
  evento: Evento;
}

type EventoEstado = "pasado" | "en-curso" | "futuro";

const EventoCard: React.FC<EventoCardProps> = ({ evento }) => {
  const getEstado = (): EventoEstado => {
    const now = new Date();
    const inicio = new Date(evento.fecha_inicio);
    const fin = new Date(evento.fecha_fin);

    if (now > fin) return "pasado";
    if (now >= inicio && now <= fin) return "en-curso";
    return "futuro";
  };

  const estado = getEstado();

  const getStatusColor = () => {
    switch (estado) {
      case "pasado":
        return "grayscale opacity-75";
      case "en-curso":
        return "ring-2 ring-green-500 dark:ring-green-400";
      case "futuro":
        return "";
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const bannerBgColor =
    estado === "pasado"
      ? "bg-gray-300 dark:bg-gray-600"
      : "bg-gradient-to-br from-blue-400 to-purple-500";

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 ${
        estado === "pasado" ? "grayscale opacity-80" : ""
      } ${getStatusColor()}`}
    >
      {/* Banner */}
      <div className={`relative h-48 w-full ${bannerBgColor} overflow-hidden`}>
        {evento.banner ? (
          <Image
            src={`${process.env.NEXT_PUBLIC_BASE_PATH}${evento.banner}`}
            alt={evento.nombre}
            fill
            className="object-cover w-full h-full"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center ${
              estado === "pasado"
                ? "bg-gray-400 dark:bg-gray-700"
                : "bg-gradient-to-br from-blue-400 to-purple-500"
            }`}
          >
            <Icon
              icon="solar:calendar-bold"
              className={`w-16 h-16 ${
                estado === "pasado"
                  ? "text-gray-500 dark:text-gray-600"
                  : "text-white/50"
              }`}
            />
          </div>
        )}

        {/* Badge overlay */}
        <div className="absolute top-4 right-4">
          <EventoCountdown
            fechaInicio={evento.fecha_inicio}
            fechaFin={evento.fecha_fin}
          />
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Título */}
        <h3
          className={`text-xl font-bold mb-2 line-clamp-2 ${
            estado === "pasado"
              ? "text-gray-600 dark:text-gray-400"
              : "text-midnight_text dark:text-white"
          }`}
        >
          {evento.nombre}
        </h3>

        {/* Ubicación */}
        {evento.ubicacion && (
          <div
            className={`flex items-center gap-2 mb-4 ${
              estado === "pasado"
                ? "text-gray-500 dark:text-gray-500"
                : "text-dark_grey dark:text-gray-400"
            }`}
          >
            <Icon
              icon="solar:map-point-bold"
              className="w-4 h-4 flex-shrink-0"
            />
            <span className="text-sm line-clamp-1">{evento.ubicacion}</span>
          </div>
        )}

        {/* Fechas */}
        <div
          className={`space-y-2 mb-6 text-sm ${
            estado === "pasado"
              ? "text-gray-500 dark:text-gray-500"
              : "text-dark_grey dark:text-gray-400"
          }`}
        >
          <div className="flex items-start gap-2">
            <Icon
              icon="solar:calendar-bold"
              className="w-4 h-4 flex-shrink-0 mt-0.5"
            />
            <div>
              <div className="font-medium">
                {formatDate(evento.fecha_inicio)}
              </div>
              <div className="text-xs">
                Inicia: {formatTime(evento.fecha_inicio)}
              </div>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Icon
              icon="solar:calendar-bold"
              className="w-4 h-4 flex-shrink-0 mt-0.5"
            />
            <div>
              <div className="font-medium">{formatDate(evento.fecha_fin)}</div>
              <div className="text-xs">
                Finaliza: {formatTime(evento.fecha_fin)}
              </div>
            </div>
          </div>
        </div>

        {/* Descripción */}
        {evento.descripcion && typeof evento.descripcion === "string" && (
          <p
            className={`text-sm line-clamp-3 mb-4 ${
              estado === "pasado"
                ? "text-gray-500 dark:text-gray-500"
                : "text-dark_grey dark:text-gray-400"
            }`}
          >
            {evento.descripcion as string}
          </p>
        )}

        {/* Estado indicador */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          {estado === "pasado" && (
            <div className="text-center text-xs font-medium text-gray-500 dark:text-gray-400">
              Este evento ya finalizó
            </div>
          )}
          {estado === "en-curso" && (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-green-600 dark:text-green-400">
              <Icon
                icon="solar:play-circle-bold"
                className="w-4 h-4 animate-pulse"
              />
              Sucediendo ahora
            </div>
          )}
          {estado === "futuro" && (
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
              <Icon icon="solar:calendar-add-bold" className="w-4 h-4" />
              Próximamente
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventoCard;
