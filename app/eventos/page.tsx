"use client";
import { useState, useEffect } from "react";
import { Icon } from "@iconify/react";
import EventoCard from "@/components/EventoCard";

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

type EventoFiltro = "todos" | "pasados" | "en-curso" | "futuros";

const EventosPage = () => {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [filtro, setFiltro] = useState<EventoFiltro>("todos");

  useEffect(() => {
    fetchEventos();
  }, []);

  const fetchEventos = async () => {
    try {
      setLoading(true);
      setError("");
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/eventos`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Error al cargar eventos");
      }

      const data = await response.json();
      setEventos(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      console.error("Error fetching eventos:", err);
      setError(
        err instanceof Error ? err.message : "Error al cargar los eventos"
      );
    } finally {
      setLoading(false);
    }
  };

  const getEstado = (evento: Evento): "pasado" | "en-curso" | "futuro" => {
    const now = new Date();
    const inicio = new Date(evento.fecha_inicio);
    const fin = new Date(evento.fecha_fin);

    if (now > fin) return "pasado";
    if (now >= inicio && now <= fin) return "en-curso";
    return "futuro";
  };

  const eventosFiltrados = eventos.filter((evento) => {
    const estado = getEstado(evento);

    switch (filtro) {
      case "pasados":
        return estado === "pasado";
      case "en-curso":
        return estado === "en-curso";
      case "futuros":
        return estado === "futuro";
      default:
        return true;
    }
  });

  const stats = {
    todos: eventos.length,
    pasados: eventos.filter((e) => getEstado(e) === "pasado").length,
    enCurso: eventos.filter((e) => getEstado(e) === "en-curso").length,
    futuros: eventos.filter((e) => getEstado(e) === "futuro").length,
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
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-12">
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setFiltro("todos")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                  filtro === "todos"
                    ? "bg-primary text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-700 text-midnight_text dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <Icon icon="solar:list-bold" className="w-5 h-5" />
                Todos ({stats.todos})
              </button>

              <button
                onClick={() => setFiltro("futuros")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                  filtro === "futuros"
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-700 text-midnight_text dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <Icon icon="solar:calendar-add-bold" className="w-5 h-5" />
                Próximos ({stats.futuros})
              </button>

              <button
                onClick={() => setFiltro("en-curso")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                  filtro === "en-curso"
                    ? "bg-green-500 text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-700 text-midnight_text dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <Icon icon="solar:play-circle-bold" className="w-5 h-5" />
                En Curso ({stats.enCurso})
              </button>

              <button
                onClick={() => setFiltro("pasados")}
                className={`flex items-center gap-2 px-6 py-3 rounded-full font-semibold transition-all duration-300 ${
                  filtro === "pasados"
                    ? "bg-gray-600 text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-700 text-midnight_text dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                <Icon icon="solar:calendar-2-bold" className="w-5 h-5" />
                Pasados ({stats.pasados})
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido */}
      <div className="w-[min(1400px,90%)] mx-auto">
        {loading ? (
          <div className="text-center py-16">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#1A21BC]/20 border-t-[#1A21BC]"></div>
            <p className="mt-6 text-midnight_text dark:text-white text-lg font-medium">
              Cargando eventos...
            </p>
          </div>
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
                : `No hay eventos ${filtro.replace("-", " ")} en este momento`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {eventosFiltrados.map((evento) => (
              <EventoCard key={evento.id} evento={evento} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default EventosPage;
