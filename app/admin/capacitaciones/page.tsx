"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import AdminProtection from "@/components/AdminProtection";

interface Capacitacion {
  id: number;
  banner: string | null;
  nombre: string;
  descripcion: unknown;
  cantidad_horas: number;
  cantidad_participantes: number;
  archivo_adjunto: string | null;
  fecha_inicio_inscripcion: string;
  fecha_final_inscripcion: string;
  fecha_inicio_capacitacion: string;
  fecha_final_capacitacion: string;
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

const CapacitacionesAdmin = () => {
  const [capacitaciones, setCapacitaciones] = useState<Capacitacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCapacitaciones = async () => {
      try {
        // Fetch ALL capacitaciones (no activo filter)
        const response = await fetch("/ciepi/api/capacitaciones");
        const result = await response.json();

        if (result.success) {
          setCapacitaciones(result.data);
        } else {
          setError(result.error || "Error al cargar capacitaciones");
        }
      } catch (err) {
        console.error("Error fetching capacitaciones:", err);
        setError("Error al cargar capacitaciones");
      } finally {
        setLoading(false);
      }
    };

    fetchCapacitaciones();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <AdminProtection>
        <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
            <p className="mt-6 text-midnight_text dark:text-white text-lg font-medium">
              Cargando...
            </p>
          </div>
        </div>
      </AdminProtection>
    );
  }

  if (error) {
    return (
      <AdminProtection>
        <div className="min-h-screen bg-slateGray dark:bg-gray-900 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="text-center text-red-600 dark:text-red-500">
              {error}
            </div>
          </div>
        </div>
      </AdminProtection>
    );
  }

  return (
    <AdminProtection>
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-midnight_text dark:text-white">
              Gestión de Capacitaciones
            </h1>
            <Link
              href="/admin/capacitaciones/crear"
              className="bg-primary text-white px-6 py-3 rounded-full hover:bg-primary/90 transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
            >
              + Nueva Capacitación
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
              <div className="text-dark_grey dark:text-gray-400 text-sm font-medium">
                Total
              </div>
              <div className="text-3xl font-bold text-midnight_text dark:text-white">
                {capacitaciones.length}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
              <div className="text-dark_grey dark:text-gray-400 text-sm font-medium">
                Activas
              </div>
              <div className="text-3xl font-bold text-success">
                {capacitaciones.filter((c) => c.activo).length}
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg">
              <div className="text-dark_grey dark:text-gray-400 text-sm font-medium">
                Inactivas
              </div>
              <div className="text-3xl font-bold text-red-600 dark:text-red-500">
                {capacitaciones.filter((c) => !c.activo).length}
              </div>
            </div>
          </div>

          {/* Capacitaciones Grid */}
          {capacitaciones.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-12 text-center">
              <p className="text-dark_grey dark:text-gray-300 text-lg mb-4">
                No hay capacitaciones registradas
              </p>
              <Link
                href="/admin/capacitaciones/crear"
                className="text-primary dark:text-blue-400 hover:text-primary/80 dark:hover:text-blue-300 font-medium"
              >
                Crear la primera capacitación
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {capacitaciones.map((capacitacion) => (
                <div
                  key={capacitacion.id}
                  className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Banner */}
                  <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
                    {capacitacion.banner ? (
                      <img
                        src={`${process.env.NEXT_PUBLIC_BASE_PATH}${capacitacion.banner}`}
                        alt={capacitacion.nombre}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg
                          className="w-16 h-16 text-white opacity-50"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-3 right-3">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          capacitacion.activo
                            ? "bg-green-500 text-white"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {capacitacion.activo ? "Activa" : "Inactiva"}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-xl font-bold text-midnight_text dark:text-white mb-3 line-clamp-2">
                      {capacitacion.nombre}
                    </h3>

                    {/* Info Grid */}
                    <div className="space-y-2 mb-4 text-sm text-dark_grey dark:text-gray-300">
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-dark_grey dark:text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                        <span>{capacitacion.cantidad_horas} horas</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-dark_grey dark:text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                          />
                        </svg>
                        <span>
                          {capacitacion.cantidad_participantes} participantes
                        </span>
                      </div>
                    </div>

                    {/* Dates */}
                    <div className="border-t border-black/10 dark:border-white/10 pt-3 mb-4 space-y-1 text-xs text-dark_grey dark:text-gray-400">
                      <div>
                        <span className="font-semibold">Inscripción:</span>{" "}
                        {formatDate(capacitacion.fecha_inicio_inscripcion)} -{" "}
                        {formatDate(capacitacion.fecha_final_inscripcion)}
                      </div>
                      <div>
                        <span className="font-semibold">Capacitación:</span>{" "}
                        {formatDate(capacitacion.fecha_inicio_capacitacion)} -{" "}
                        {formatDate(capacitacion.fecha_final_capacitacion)}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/capacitaciones/editar/${capacitacion.id}`}
                        className="flex-1 bg-primary text-white text-center py-2 px-4 rounded-full hover:bg-primary/90 transition-all duration-300 font-medium text-sm"
                      >
                        Editar
                      </Link>
                      <Link
                        href={`/admin/capacitaciones/detalles/${capacitacion.id}`}
                        className="flex-1 bg-gray-200 dark:bg-gray-700 text-midnight_text dark:text-white py-2 px-4 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 font-medium text-sm"
                      >
                        Ver Detalles
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminProtection>
  );
};

export default CapacitacionesAdmin;
