"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "@iconify/react";

interface Capacitacion {
  id: number;
  banner: string | null;
  nombre: string;
  descripcion: unknown;
  cantidad_horas: number | null;
  cantidad_participantes: number | null;
  archivo_adjunto: string | null;
  fecha_inicio_inscripcion: string | null;
  fecha_final_inscripcion: string | null;
  fecha_inicio_capacitacion: string | null;
  fecha_final_capacitacion: string | null;
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

const CapacitacionesPage = () => {
  const router = useRouter();
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchCapacitaciones();
  }, []);

  const fetchCapacitaciones = async () => {
    try {
      setLoading(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(
        `${basePath}/api/capacitaciones?activo=true`
      );

      if (!response.ok) {
        throw new Error("Error al cargar capacitaciones");
      }

      const data = await response.json();
      setCapacitaciones(data.data || []);
    } catch (err) {
      console.error("Error fetching capacitaciones:", err);
      setError(
        err instanceof Error ? err.message : "Error al cargar capacitaciones"
      );
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "No especificada";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-PA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleVerMas = (capacitacionId: number) => {
    // Redirigir a la página de detalles
    router.push(`/capacitaciones/${capacitacionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slateGray flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#1A21BC]/20 border-t-[#1A21BC]"></div>
          <p className="mt-6 text-midnight_text text-lg font-medium">
            Cargando capacitaciones...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slateGray flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl shadow-xl p-10 max-w-md">
          <Icon
            icon="solar:danger-circle-bold"
            className="text-red-500 text-6xl mx-auto mb-4"
          />
          <p className="text-midnight_text mb-6 text-lg">{error}</p>
          <button
            onClick={fetchCapacitaciones}
            className="px-10 py-4 bg-primary text-white rounded-full hover:bg-primary/90 transition-all duration-300 shadow-lg font-medium text-lg"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-slateGray min-h-screen pt-32 pb-20">
      <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4">
        {/* Header with Badge */}
        <div className="mb-12 text-center">
          <div className="flex gap-2 items-center justify-center mb-6">
            <Icon
              icon="solar:verified-check-bold"
              className="text-success text-2xl"
            />
            <p className="text-success text-base font-semibold">
              Capacitaciones Profesionales
            </p>
          </div>
          <h1 className="text-midnight_text text-4xl sm:text-5xl font-bold mb-4">
            Capacitaciones Disponibles
          </h1>
          <p className="text-dark_grey text-lg max-w-2xl mx-auto">
            Explora nuestras capacitaciones activas y avanza en tu desarrollo
            profesional
          </p>
        </div>

        {/* Capacitaciones Grid */}
        {capacitaciones.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl shadow-lg">
            <Icon
              icon="solar:diploma-verified-linear"
              className="text-dark_grey text-8xl mx-auto mb-6 opacity-30"
            />
            <h3 className="text-2xl font-bold text-midnight_text mb-3">
              No hay capacitaciones disponibles
            </h3>
            <p className="text-dark_grey text-lg">
              Por el momento no hay capacitaciones activas. Vuelve pronto.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {capacitaciones.map((capacitacion) => (
              <div
                key={capacitacion.id}
                className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 group hover:-translate-y-2"
              >
                {/* Banner Image */}
                {capacitacion.banner ? (
                  <div className="relative h-56 w-full bg-gray-200 overflow-hidden">
                    <Image
                      src={`${process.env.NEXT_PUBLIC_BASE_PATH}${capacitacion.banner}`}
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
                  <h2 className="text-xl font-bold text-midnight_text mb-4 line-clamp-2 group-hover:text-primary transition-colors">
                    {capacitacion.nombre}
                  </h2>

                  {/* Info Grid */}
                  <div className="space-y-3 mb-5">
                    {capacitacion.cantidad_horas && (
                      <div className="flex items-center text-sm text-dark_grey">
                        <div className="w-9 h-9 rounded-full bg-slateGray flex items-center justify-center mr-3">
                          <Icon
                            icon="solar:clock-circle-linear"
                            className="w-5 h-5 text-primary"
                          />
                        </div>
                        <span className="font-medium">
                          {capacitacion.cantidad_horas} hora
                          {capacitacion.cantidad_horas !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}

                    {capacitacion.cantidad_participantes && (
                      <div className="flex items-center text-sm text-dark_grey">
                        <div className="w-9 h-9 rounded-full bg-slateGray flex items-center justify-center mr-3">
                          <Icon
                            icon="solar:users-group-rounded-linear"
                            className="w-5 h-5 text-primary"
                          />
                        </div>
                        <span className="font-medium">
                          Cupos disponibles:{" "}
                          {capacitacion.cantidad_participantes}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Dates Section */}
                  <div className="border-t border-gray-100 pt-5 mb-6">
                    <div className="space-y-3 text-sm">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Icon
                            icon="solar:calendar-mark-linear"
                            className="w-4 h-4 text-success"
                          />
                          <span className="font-bold text-midnight_text">
                            Inscripción:
                          </span>
                        </div>
                        <p className="text-dark_grey ml-6">
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
                          <span className="font-bold text-midnight_text">
                            Capacitación:
                          </span>
                        </div>
                        <p className="text-dark_grey ml-6">
                          {formatDate(capacitacion.fecha_inicio_capacitacion)} -{" "}
                          {formatDate(capacitacion.fecha_final_capacitacion)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleVerMas(capacitacion.id)}
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
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CapacitacionesPage;
