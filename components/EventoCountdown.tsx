"use client";
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react";

interface EventoCountdownProps {
  fechaInicio: string;
  fechaFin: string;
  estado?: "pasado" | "en-curso" | "futuro";
}

interface TimeRemaining {
  meses?: number;
  dias?: number;
  horas?: number;
  minutos?: number;
  segundos?: number;
  type: "meses" | "dias" | "horas" | "en-curso" | "pasado";
}

const EventoCountdown: React.FC<EventoCountdownProps> = ({
  fechaInicio,
  fechaFin,
}) => {
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(
    null
  );
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const calculateTimeRemaining = () => {
      const now = new Date();
      const inicio = new Date(fechaInicio);
      const fin = new Date(fechaFin);

      // Determinar estado
      if (now > fin) {
        setTimeRemaining({ type: "pasado" });
        return;
      }

      if (now >= inicio && now <= fin) {
        setTimeRemaining({ type: "en-curso" });
        return;
      }

      // Calcular tiempo faltante hasta inicio
      const diff = inicio.getTime() - now.getTime();
      const totalHours = diff / (1000 * 60 * 60);
      const totalDays = totalHours / 24;

      if (totalHours <= 24) {
        // Mostrar horas y minutos
        const hours = Math.floor(totalHours);
        const minutes = Math.floor((totalHours - hours) * 60);
        setTimeRemaining({
          horas: hours,
          minutos: minutes,
          type: "horas",
        });
      } else if (totalDays <= 30) {
        // Mostrar días
        const days = Math.floor(totalDays);
        setTimeRemaining({
          dias: days,
          type: "dias",
        });
      } else {
        // Mostrar meses
        const months = Math.floor(totalDays / 30);
        setTimeRemaining({
          meses: months,
          type: "meses",
        });
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 60000); // Actualizar cada minuto

    return () => clearInterval(interval);
  }, [fechaInicio, fechaFin, mounted]);

  if (!mounted || !timeRemaining) {
    return null;
  }

  if (timeRemaining.type === "pasado") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-full">
        <Icon
          icon="solar:calendar-2-bold"
          className="w-4 h-4 text-gray-600 dark:text-gray-400"
        />
        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
          Evento Pasado
        </span>
      </div>
    );
  }

  if (timeRemaining.type === "en-curso") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-full animate-pulse">
        <Icon
          icon="solar:play-bold"
          className="w-4 h-4 text-green-600 dark:text-green-400"
        />
        <span className="text-xs font-semibold text-green-700 dark:text-green-400">
          En Curso Ahora
        </span>
      </div>
    );
  }

  if (timeRemaining.type === "horas") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-100 dark:bg-red-900/30 rounded-full">
        <Icon
          icon="solar:alarm-bold"
          className="w-4 h-4 text-red-600 dark:text-red-400"
        />
        <span className="text-xs font-semibold text-red-700 dark:text-red-400">
          {timeRemaining.horas}h {timeRemaining.minutos}m
        </span>
      </div>
    );
  }

  if (timeRemaining.type === "dias") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
        <Icon
          icon="solar:calendar-bold"
          className="w-4 h-4 text-yellow-600 dark:text-yellow-400"
        />
        <span className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
          En {timeRemaining.dias} día{timeRemaining.dias !== 1 ? "s" : ""}
        </span>
      </div>
    );
  }

  // Meses
  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
      <Icon
        icon="solar:calendar-add-bold"
        className="w-4 h-4 text-blue-600 dark:text-blue-400"
      />
      <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">
        En {timeRemaining.meses} mes{timeRemaining.meses !== 1 ? "es" : ""}
      </span>
    </div>
  );
};

export default EventoCountdown;
