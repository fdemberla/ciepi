"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando capacitaciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={fetchCapacitaciones}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Capacitaciones Disponibles
          </h1>
          <p className="text-gray-600">
            Explora nuestras capacitaciones activas e inscríbete
          </p>
        </div>

        {/* Capacitaciones Grid */}
        {capacitaciones.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 text-5xl mb-4">📚</div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">
              No hay capacitaciones disponibles
            </h3>
            <p className="text-gray-500">
              Por el momento no hay capacitaciones activas. Vuelve pronto.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capacitaciones.map((capacitacion) => (
              <div
                key={capacitacion.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                {/* Banner Image */}
                {capacitacion.banner ? (
                  <div className="relative h-48 w-full bg-gray-200">
                    <Image
                      src={`${process.env.NEXT_PUBLIC_BASE_PATH}${capacitacion.banner}`}
                      alt={capacitacion.nombre}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="h-48 w-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                    <svg
                      className="w-16 h-16 text-white opacity-50"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5"
                      />
                    </svg>
                  </div>
                )}

                {/* Card Content */}
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                    {capacitacion.nombre}
                  </h2>

                  {/* Info Grid */}
                  <div className="space-y-2 mb-4">
                    {capacitacion.cantidad_horas && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg
                          className="w-4 h-4 mr-2 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>
                          {capacitacion.cantidad_horas} hora
                          {capacitacion.cantidad_horas !== 1 ? "s" : ""}
                        </span>
                      </div>
                    )}

                    {capacitacion.cantidad_participantes && (
                      <div className="flex items-center text-sm text-gray-600">
                        <svg
                          className="w-4 h-4 mr-2 text-blue-600"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          viewBox="0 0 24 24"
                          xmlns="http://www.w3.org/2000/svg"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                          />
                        </svg>
                        <span>
                          Cupos: {capacitacion.cantidad_participantes}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Dates Section */}
                  <div className="border-t border-gray-200 pt-4 mb-4">
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-semibold text-gray-700">
                          Inscripción:
                        </span>
                        <p className="text-gray-600">
                          {formatDate(capacitacion.fecha_inicio_inscripcion)} -{" "}
                          {formatDate(capacitacion.fecha_final_inscripcion)}
                        </p>
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">
                          Capacitación:
                        </span>
                        <p className="text-gray-600">
                          {formatDate(capacitacion.fecha_inicio_capacitacion)} -{" "}
                          {formatDate(capacitacion.fecha_final_capacitacion)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <button
                    onClick={() => handleVerMas(capacitacion.id)}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-semibold"
                  >
                    Más Información
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CapacitacionesPage;
