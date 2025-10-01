"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

const CapacitacionDetailPage = () => {
  const params = useParams();
  const router = useRouter();
  const capacitacionId = params.id as string;

  const [capacitacion, setCapacitacion] = useState<Capacitacion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    fetchCapacitacion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacitacionId]);

  const fetchCapacitacion = async () => {
    try {
      setLoading(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(
        `${basePath}/api/admin/capacitaciones/${capacitacionId}`
      );

      if (!response.ok) {
        throw new Error("Error al cargar la capacitación");
      }

      const data = await response.json();
      setCapacitacion(data.data);
    } catch (err) {
      console.error("Error fetching capacitacion:", err);
      setError(
        err instanceof Error ? err.message : "Error al cargar la capacitación"
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

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "No especificada";
    const date = new Date(dateString);
    return date.toLocaleDateString("es-PA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleInscribirse = () => {
    router.push(`/capacitaciones/inscribirse/${capacitacionId}`);
  };

  const handleVolver = () => {
    router.push("/capacitaciones");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Cargando información...
          </p>
        </div>
      </div>
    );
  }

  if (error || !capacitacion) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️</div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            {error || "Capacitación no encontrada"}
          </p>
          <button
            onClick={handleVolver}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Volver a Capacitaciones
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 sm:py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-5xl">
        {/* Back Button */}
        <button
          onClick={handleVolver}
          className="mb-6 flex items-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"
            />
          </svg>
          Volver a Capacitaciones
        </button>

        {/* Main Content Card */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Banner */}
          {capacitacion.banner ? (
            <div className="relative h-64 sm:h-80 w-full bg-gray-200 dark:bg-gray-700">
              <Image
                src={`${process.env.NEXT_PUBLIC_BASE_PATH}${capacitacion.banner}`}
                alt={capacitacion.nombre}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-64 sm:h-80 w-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              <svg
                className="w-24 h-24 text-white opacity-50"
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

          {/* Content */}
          <div className="p-6 sm:p-8">
            {/* Title */}
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-6">
              {capacitacion.nombre}
            </h1>

            {/* Quick Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {capacitacion.cantidad_horas && (
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <div className="bg-blue-100 dark:bg-blue-900 rounded-full p-3 mr-4">
                    <svg
                      className="w-6 h-6 text-blue-600 dark:text-blue-400"
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
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Duración
                    </p>
                    <p className="font-semibold">
                      {capacitacion.cantidad_horas} hora
                      {capacitacion.cantidad_horas !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              )}

              {capacitacion.cantidad_participantes && (
                <div className="flex items-center text-gray-700 dark:text-gray-300">
                  <div className="bg-green-100 dark:bg-green-900 rounded-full p-3 mr-4">
                    <svg
                      className="w-6 h-6 text-green-600 dark:text-green-400"
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
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Cupos Disponibles
                    </p>
                    <p className="font-semibold">
                      {capacitacion.cantidad_participantes} participantes
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {capacitacion.descripcion && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Descripción
                </h2>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {String(capacitacion.descripcion)}
                  </p>
                </div>
              </div>
            )}

            {/* Dates Section */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                Fechas Importantes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inscripción */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-5 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center mb-3">
                    <svg
                      className="w-6 h-6 text-blue-600 dark:text-blue-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                      />
                    </svg>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Período de Inscripción
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Inicio:{" "}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDate(capacitacion.fecha_inicio_inscripcion)}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Fin:{" "}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDate(capacitacion.fecha_final_inscripcion)}
                    </span>
                  </p>
                </div>

                {/* Capacitación */}
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-5 border border-purple-200 dark:border-purple-800">
                  <div className="flex items-center mb-3">
                    <svg
                      className="w-6 h-6 text-purple-600 dark:text-purple-400 mr-2"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      viewBox="0 0 24 24"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                      />
                    </svg>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      Período de Capacitación
                    </h3>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Inicio:{" "}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDate(capacitacion.fecha_inicio_capacitacion)}
                    </span>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Fin:{" "}
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formatDate(capacitacion.fecha_final_capacitacion)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* Archivo Adjunto */}
            {capacitacion.archivo_adjunto && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                  Material Adicional
                </h2>
                <a
                  href={`${process.env.NEXT_PUBLIC_BASE_PATH}${capacitacion.archivo_adjunto}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                    />
                  </svg>
                  Descargar Material
                </a>
              </div>
            )}

            {/* CTA Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-8">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg p-6 sm:p-8">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                  ¿Listo para inscribirte?
                </h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  No pierdas la oportunidad de participar en esta capacitación.
                  ¡Inscríbete ahora y comienza tu aprendizaje!
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleInscribirse}
                    className="flex-1 bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
                  >
                    Inscríbete Ahora
                  </button>
                  <button
                    onClick={handleVolver}
                    className="flex-1 sm:flex-initial bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-4 px-6 rounded-lg border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors font-semibold"
                  >
                    Ver Otras Capacitaciones
                  </button>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
              <p>
                Capacitación creada el {formatDateTime(capacitacion.fecha_creacion)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CapacitacionDetailPage;
