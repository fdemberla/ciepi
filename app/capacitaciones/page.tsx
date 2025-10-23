"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import CapacitacionCard from "@/components/CapacitacionCard";

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

  const handleVerMas = (capacitacionId: number) => {
    // Redirigir a la página de detalles
    router.push(`/capacitaciones/${capacitacionId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#1A21BC]/20 border-t-[#1A21BC]"></div>
          <p className="mt-6 text-midnight_text dark:text-white text-lg font-medium">
            Cargando capacitaciones...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 max-w-md">
          <Icon
            icon="solar:danger-circle-bold"
            className="text-red-500 text-6xl mx-auto mb-4"
          />
          <p className="text-midnight_text dark:text-white mb-6 text-lg">
            {error}
          </p>
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
    <section className="bg-slateGray dark:bg-gray-900 min-h-screen pt-32 pb-20">
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
          <h1 className="text-midnight_text dark:text-white text-4xl sm:text-5xl font-bold mb-4">
            Capacitaciones Disponibles
          </h1>
          <p className="text-dark_grey dark:text-gray-400 text-lg max-w-2xl mx-auto">
            Explora nuestras capacitaciones activas y avanza en tu desarrollo
            profesional
          </p>
        </div>

        {/* Capacitaciones Grid */}
        {capacitaciones.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-lg">
            <Icon
              icon="solar:diploma-verified-linear"
              className="text-dark_grey dark:text-gray-400 text-8xl mx-auto mb-6 opacity-30"
            />
            <h3 className="text-2xl font-bold text-midnight_text dark:text-white mb-3">
              No hay capacitaciones disponibles
            </h3>
            <p className="text-dark_grey dark:text-gray-400 text-lg">
              Por el momento no hay capacitaciones activas. Vuelve pronto.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {capacitaciones.map((capacitacion) => (
              <CapacitacionCard
                key={capacitacion.id}
                capacitacion={capacitacion}
                onVerMas={handleVerMas}
                basePath={process.env.NEXT_PUBLIC_BASE_PATH}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default CapacitacionesPage;
