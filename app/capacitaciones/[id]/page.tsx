"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "@iconify/react";
import SlateRenderer from "@/components/SlateRenderer";

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
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#1A21BC]/20 border-t-[#1A21BC]"></div>
          <p className="mt-6 text-midnight_text dark:text-white text-lg font-medium">
            Cargando información...
          </p>
        </div>
      </div>
    );
  }

  if (error || !capacitacion) {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 max-w-md">
          <Icon
            icon="solar:danger-circle-bold"
            className="text-red-500 text-6xl mx-auto mb-4"
          />
          <p className="text-midnight_text dark:text-white mb-6 text-lg">
            {error || "Capacitación no encontrada"}
          </p>
          <button
            onClick={handleVolver}
            className="px-10 py-4 bg-primary text-white rounded-full hover:bg-primary/90 transition-all duration-300 shadow-lg font-medium text-lg"
          >
            Volver a Capacitaciones
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-slateGray dark:bg-gray-900 min-h-screen pt-32 pb-20">
      <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4">
        {/* Back Button */}
        <button
          onClick={handleVolver}
          className="mb-8 flex items-center text-midnight_text dark:text-white hover:text-primary dark:hover:text-primary transition-colors font-medium group"
        >
          <Icon
            icon="solar:alt-arrow-left-linear"
            className="w-6 h-6 mr-2 group-hover:-translate-x-1 transition-transform"
          />
          Volver a Capacitaciones
        </button>

        {/* Main Content Card */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
          {/* Banner */}
          {capacitacion.banner ? (
            <div className="relative h-80 sm:h-96 w-full bg-gray-200 overflow-hidden">
              <Image
                src={`${process.env.NEXT_PUBLIC_BASE_PATH}${capacitacion.banner}`}
                alt={capacitacion.nombre}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div className="h-80 sm:h-96 w-full bg-gradient-to-br from-primary to-blue-700 flex items-center justify-center">
              <Icon
                icon="solar:diploma-verified-linear"
                className="text-white text-9xl opacity-40"
              />
            </div>
          )}

          {/* Content */}
          <div className="p-8 sm:p-12">
            {/* Badge */}
            <div className="flex gap-2 items-center mb-6">
              <Icon
                icon="solar:verified-check-bold"
                className="text-success text-2xl"
              />
              <p className="text-success text-base font-semibold">
                Capacitación Profesional
              </p>
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl font-bold text-midnight_text dark:text-white mb-8">
              {capacitacion.nombre}
            </h1>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
              {capacitacion.cantidad_horas && (
                <div className="bg-slateGray dark:bg-gray-700 rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center shadow-lg">
                    <Icon
                      icon="solar:clock-circle-linear"
                      className="w-7 h-7 text-white"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-dark_grey dark:text-gray-400 font-medium">
                      Duración Total
                    </p>
                    <p className="text-xl font-bold text-midnight_text dark:text-white">
                      {capacitacion.cantidad_horas} hora
                      {capacitacion.cantidad_horas !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              )}

              {capacitacion.cantidad_participantes && (
                <div className="bg-slateGray dark:bg-gray-700 rounded-2xl p-6 flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-success flex items-center justify-center shadow-lg">
                    <Icon
                      icon="solar:users-group-rounded-linear"
                      className="w-7 h-7 text-white"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-dark_grey dark:text-gray-400 font-medium">
                      Cupos Disponibles
                    </p>
                    <p className="text-xl font-bold text-midnight_text dark:text-white">
                      {capacitacion.cantidad_participantes} participantes
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Description */}
            {capacitacion.descripcion && (
              <div className="mb-10">
                <h2 className="text-3xl font-bold text-midnight_text dark:text-white mb-6 flex items-center gap-3">
                  <Icon
                    icon="solar:document-text-linear"
                    className="w-8 h-8 text-primary"
                  />
                  Descripción
                </h2>
                <SlateRenderer
                  content={capacitacion.descripcion}
                  className="prose max-w-none"
                />
              </div>
            )}

            {/* Dates Section */}
            <div className="mb-10">
              <h2 className="text-3xl font-bold text-midnight_text dark:text-white mb-6 flex items-center gap-3">
                <Icon
                  icon="solar:calendar-linear"
                  className="w-8 h-8 text-primary"
                />
                Fechas Importantes
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Inscripción */}
                <div className="bg-gradient-to-br from-primary/10 to-[#1A21BC]/5 dark:from-primary/20 dark:to-[#1A21BC]/10 rounded-2xl p-6 border-2 border-[#1A21BC]/20 dark:border-[#1A21BC]/30">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center mr-3">
                      <Icon
                        icon="solar:pen-new-square-linear"
                        className="w-6 h-6 text-white"
                      />
                    </div>
                    <h3 className="text-xl font-bold text-midnight_text dark:text-white">
                      Período de Inscripción
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-dark_grey dark:text-gray-300">
                      <span className="font-semibold text-midnight_text dark:text-white">
                        Inicio:
                      </span>{" "}
                      {formatDate(capacitacion.fecha_inicio_inscripcion)}
                    </p>
                    <p className="text-sm text-dark_grey dark:text-gray-300">
                      <span className="font-semibold text-midnight_text dark:text-white">
                        Fin:
                      </span>{" "}
                      {formatDate(capacitacion.fecha_final_inscripcion)}
                    </p>
                  </div>
                </div>

                {/* Capacitación */}
                <div className="bg-gradient-to-br from-success/10 to-success/5 dark:from-success/20 dark:to-success/10 rounded-2xl p-6 border-2 border-success/20 dark:border-success/30">
                  <div className="flex items-center mb-4">
                    <div className="w-12 h-12 rounded-full bg-success flex items-center justify-center mr-3">
                      <Icon
                        icon="solar:calendar-mark-linear"
                        className="w-6 h-6 text-white"
                      />
                    </div>
                    <h3 className="text-xl font-bold text-midnight_text dark:text-white">
                      Período de Capacitación
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm text-dark_grey dark:text-gray-300">
                      <span className="font-semibold text-midnight_text dark:text-white">
                        Inicio:
                      </span>{" "}
                      {formatDate(capacitacion.fecha_inicio_capacitacion)}
                    </p>
                    <p className="text-sm text-dark_grey dark:text-gray-300">
                      <span className="font-semibold text-midnight_text dark:text-white">
                        Fin:
                      </span>{" "}
                      {formatDate(capacitacion.fecha_final_capacitacion)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Archivo Adjunto */}
            {capacitacion.archivo_adjunto && (
              <div className="mb-10">
                <h2 className="text-3xl font-bold text-midnight_text dark:text-white mb-6 flex items-center gap-3">
                  <Icon
                    icon="solar:document-add-linear"
                    className="w-8 h-8 text-primary"
                  />
                  Material Adicional
                </h2>
                <a
                  href={`${process.env.NEXT_PUBLIC_BASE_PATH}${capacitacion.archivo_adjunto}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-8 py-4 bg-slateGray dark:bg-gray-700 text-midnight_text dark:text-white rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl group"
                >
                  <Icon
                    icon="solar:download-linear"
                    className="w-6 h-6 mr-3 group-hover:scale-110 transition-transform"
                  />
                  Descargar Material
                </a>
              </div>
            )}

            {/* CTA Section */}
            <div className="border-t border-gray-200 pt-10 mt-10">
              <div className="bg-gradient-to-br from-primary to-blue-700 rounded-3xl p-8 sm:p-12 text-white shadow-2xl">
                <div className="flex items-center gap-3 mb-4">
                  <Icon
                    icon="solar:verified-check-bold"
                    className="text-white text-3xl"
                  />
                  <h3 className="text-3xl sm:text-4xl font-bold">
                    ¿Listo para inscribirte?
                  </h3>
                </div>
                <p className="text-white/90 text-lg mb-8 max-w-2xl">
                  No pierdas la oportunidad de participar en esta capacitación.
                  ¡Inscríbete ahora y comienza tu desarrollo profesional!
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <button
                    onClick={handleInscribirse}
                    className="flex-1 bg-white text-primary py-5 px-8 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-4 focus:ring-white/30 transition-all duration-300 font-bold text-lg shadow-xl hover:shadow-2xl hover:-translate-y-1"
                  >
                    Inscríbete Ahora
                    <Icon
                      icon="solar:arrow-right-linear"
                      className="w-6 h-6 inline-block ml-2"
                    />
                  </button>
                  <button
                    onClick={handleVolver}
                    className="flex-1 sm:flex-initial bg-white/10 backdrop-blur-sm text-white py-5 px-8 rounded-full border-2 border-white/30 hover:bg-white/20 transition-all duration-300 font-semibold"
                  >
                    Ver Otras Capacitaciones
                  </button>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-8 text-center text-sm text-dark_grey dark:text-gray-400">
              <p className="flex items-center justify-center gap-2">
                <Icon icon="solar:clock-circle-linear" className="w-4 h-4" />
                Capacitación creada el{" "}
                {formatDateTime(capacitacion.fecha_creacion)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CapacitacionDetailPage;
