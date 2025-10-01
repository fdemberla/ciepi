"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import toast from "react-hot-toast";

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
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-gray-600">
            Cargando capacitaciones...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Gestión de Capacitaciones
          </h1>
          <Link
            href="/admin/capacitaciones/crear"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            + Nueva Capacitación
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm font-medium">Total</div>
            <div className="text-3xl font-bold text-gray-900">
              {capacitaciones.length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm font-medium">Activas</div>
            <div className="text-3xl font-bold text-green-600">
              {capacitaciones.filter((c) => c.activo).length}
            </div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-gray-500 text-sm font-medium">Inactivas</div>
            <div className="text-3xl font-bold text-red-600">
              {capacitaciones.filter((c) => !c.activo).length}
            </div>
          </div>
        </div>

        {/* Capacitaciones Grid */}
        {capacitaciones.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg mb-4">
              No hay capacitaciones registradas
            </p>
            <Link
              href="/admin/capacitaciones/crear"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Crear la primera capacitación
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {capacitaciones.map((capacitacion) => (
              <div
                key={capacitacion.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                {/* Banner */}
                <div className="relative h-48 bg-gradient-to-br from-blue-500 to-purple-600">
                  {capacitacion.banner ? (
                    <Image
                      src={`${process.env.NEXT_PUBLIC_BASE_PATH}${capacitacion.banner}`}
                      alt={capacitacion.nombre}
                      fill
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
                  <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                    {capacitacion.nombre}
                  </h3>

                  {/* Info Grid */}
                  <div className="space-y-2 mb-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-gray-400"
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
                        className="w-4 h-4 text-gray-400"
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
                  <div className="border-t pt-3 mb-4 space-y-1 text-xs text-gray-500">
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
                      className="flex-1 bg-blue-600 text-white text-center py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => {
                        // TODO: Implement view details
                        toast(`Ver detalles de: ${capacitacion.nombre}`, {
                          icon: "ℹ️",
                        });
                      }}
                      className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors font-medium text-sm"
                    >
                      Ver Detalles
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CapacitacionesAdmin;
