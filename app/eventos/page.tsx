"use client";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import EventoCard, { type Evento } from "@/components/EventoCard";
import CalendarGrid from "@/components/CalendarGrid";
import type { CalendarEvent } from "@/lib/calendarUtils";
import {
  fechaPanamaEvento,
  ZONA_PANAMA,
  type EstadoEvento,
} from "@/lib/eventoEstado";

type EventoFiltro = "todos" | EstadoEvento;

type Conteos = Record<EventoFiltro, number>;
const CONTEOS_VACIOS: Conteos = { todos: 0, proximo: 0, en_curso: 0, finalizado: 0 };

const TEXTO_FILTRO: Record<EstadoEvento, string> = {
  proximo: "próximos",
  en_curso: "en curso",
  finalizado: "pasados",
};

const EventosPage = () => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [conteos, setConteos] = useState<Conteos>(CONTEOS_VACIOS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [filtro, setFiltro] = useState<EventoFiltro>("todos");
  const [vista, setVista] = useState<"tarjetas" | "calendario">("tarjetas");
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());

  // El filtro por estado se aplica en la API (en SQL, antes del LIMIT).
  useEffect(() => {
    let cancelado = false;
    const fetchEventos = async () => {
      try {
        setLoading(true);
        setError("");
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const qs = filtro === "todos" ? "" : `?estado=${filtro}`;
        const response = await fetch(`${basePath}/api/eventos${qs}`, {
          method: "GET",
        });

        if (!response.ok) {
          throw new Error("Error al cargar eventos");
        }

        const data = await response.json();
        if (cancelado) return;
        setEventos(Array.isArray(data.data) ? data.data : []);
        if (data.conteos) setConteos({ ...CONTEOS_VACIOS, ...data.conteos });
      } catch (err) {
        if (cancelado) return;
        console.error("Error fetching eventos:", err);
        setError(
          err instanceof Error ? err.message : "Error al cargar los eventos",
        );
      } finally {
        if (!cancelado) setLoading(false);
      }
    };
    fetchEventos();
    return () => {
      cancelado = true;
    };
  }, [filtro]);

  const eventosFiltrados = eventos;

  const stats = {
    todos: conteos.todos,
    pasados: conteos.finalizado,
    enCurso: conteos.en_curso,
    futuros: conteos.proximo,
  };

  return (
    <section className="bg-slateGray dark:bg-gray-900 min-h-screen pt-32 pb-20">
      {/* Header */}
      <div className="w-full mb-16">
        <div className="w-[min(1400px,90%)] mx-auto">
          <div className="mb-12">
            <h1 className="text-5xl sm:text-6xl font-bold text-midnight_text dark:text-white mb-4">
              Eventos
            </h1>
            <p className="text-xl text-dark_grey dark:text-gray-400">
              Descubre nuestros próximos eventos y capacitaciones
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-8 p-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
              <p className="text-red-700 dark:text-red-400 font-medium">
                {error}
              </p>
            </div>
          )}

          {/* Filtros */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-5 mb-12">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFiltro("todos")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ${
                  filtro === "todos"
                    ? "bg-primary text-white shadow-md"
                    : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-midnight_text dark:text-white hover:border-primary/40 hover:text-primary"
                }`}
              >
                <Icon icon="solar:list-bold" className="w-4 h-4" />
                Todos <span className="font-bold">({stats.todos})</span>
              </button>

              <button
                onClick={() => setFiltro("proximo")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ${
                  filtro === "proximo"
                    ? "bg-primary text-white shadow-md"
                    : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-midnight_text dark:text-white hover:border-primary/40 hover:text-primary"
                }`}
              >
                <Icon icon="solar:calendar-add-bold" className="w-4 h-4" />
                Próximos <span className="font-bold">({stats.futuros})</span>
              </button>

              <button
                onClick={() => setFiltro("en_curso")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ${
                  filtro === "en_curso"
                    ? "bg-primary text-white shadow-md"
                    : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-midnight_text dark:text-white hover:border-primary/40 hover:text-primary"
                }`}
              >
                <Icon icon="solar:play-circle-bold" className="w-4 h-4" />
                En Curso <span className="font-bold">({stats.enCurso})</span>
              </button>

              <button
                onClick={() => setFiltro("finalizado")}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-semibold text-sm transition-all duration-200 ${
                  filtro === "finalizado"
                    ? "bg-primary text-white shadow-md"
                    : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-midnight_text dark:text-white hover:border-primary/40 hover:text-primary"
                }`}
              >
                <Icon icon="solar:calendar-2-bold" className="w-4 h-4" />
                Pasados <span className="font-bold">({stats.pasados})</span>
              </button>

              <div className="ml-auto flex items-center gap-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full p-1">
                <button
                  type="button"
                  onClick={() => setVista("tarjetas")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    vista === "tarjetas"
                      ? "bg-primary text-white"
                      : "text-midnight_text dark:text-gray-200"
                  }`}
                >
                  <Icon icon="solar:widget-2-linear" className="text-sm" />
                  Tarjetas
                </button>
                <button
                  type="button"
                  onClick={() => setVista("calendario")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    vista === "calendario"
                      ? "bg-primary text-white"
                      : "text-midnight_text dark:text-gray-200"
                  }`}
                >
                  <Icon icon="solar:calendar-mark-linear" className="text-sm" />
                  Calendario
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="w-[min(1400px,90%)] mx-auto">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
            <p className="mt-6 text-midnight_text dark:text-white text-lg font-medium">
              Cargando eventos...
            </p>
          </div>
        ) : vista === "calendario" ? (
          <CalendarGrid
            year={calYear}
            monthIndex0={calMonth}
            onMonthChange={(y, m) => {
              setCalYear(y);
              setCalMonth(m);
            }}
            events={eventosFiltrados.map((ev): CalendarEvent => {
              // Día y hora en Panamá, igual que en las tarjetas
              const inicio = ev.fecha_inicio ?? ev.fecha_fin;
              const dateStr = fechaPanamaEvento(inicio);
              const startTime = inicio
                ? new Date(inicio).toLocaleTimeString("es-PA", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                    timeZone: ZONA_PANAMA,
                  })
                : undefined;
              return {
                id: `evento-${ev.id}`,
                title: ev.nombre,
                date: dateStr,
                startTime,
                color: "emerald",
                badge: "Evento",
                location: ev.ubicacion,
              };
            })}
            emptyDayText="No hay eventos programados para este día."
          />
        ) : eventosFiltrados.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl">
            <Icon
              icon="solar:inbox-in-bold"
              className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4"
            />
            <p className="text-lg font-semibold text-midnight_text dark:text-white mb-2">
              No hay eventos
            </p>
            <p className="text-dark_grey dark:text-gray-400">
              {filtro === "todos"
                ? "No hay eventos disponibles en este momento"
                : `No hay eventos ${TEXTO_FILTRO[filtro]} en este momento`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {eventosFiltrados.map((evento, index) => (
              <div
                key={evento.id}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <EventoCard evento={evento} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default EventosPage;
