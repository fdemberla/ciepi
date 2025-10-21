"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { ColumnDef } from "@tanstack/react-table";
import AdminProtection from "@/components/AdminProtection";
import Table from "@/components/Table";
import EstadoSelector from "@/components/EstadoSelector";

interface Capacitacion {
  id: number;
  nombre: string;
}

interface EstadoInscripcion {
  id: number;
  nombre: string;
  descripcion: string;
}

interface Inscripcion {
  id: number;
  estado: EstadoInscripcion;
  fecha_inscripcion: string;
  fecha_ultima_actualizacion: string;
}

interface Estudiante {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  nombre_cedula: string;
  sexo?: string;
  estado_civil?: string;
  fecha_nacimiento?: string;
  correo: string;
  telefono: string;
  correo_verificado: boolean;
  fecha_registro: string;
}

interface Ubicacion {
  provincia: { id: number; nombre: string };
  distrito?: { id: number; nombre: string } | null;
  corregimiento?: { id: number; nombre: string } | null;
  calle?: string;
}

interface EstudianteInscrito {
  inscripcion: Inscripcion;
  estudiante: Estudiante;
  ubicacion?: Ubicacion | null;
}

interface Estadistica {
  id: number;
  nombre: string;
  descripcion: string;
  cantidad: number;
}

interface ApiResponse {
  success: boolean;
  data: {
    capacitacion: Capacitacion;
    estudiantes: EstudianteInscrito[];
    estadisticas: Record<string, Estadistica>;
    totales: {
      total_inscritos: number;
      con_correo_verificado: number;
      sin_correo_verificado: number;
    };
  };
}

export default function DetallesCapacitacionPage() {
  const params = useParams();
  const router = useRouter();
  const capacitacionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiResponse["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [busqueda, setBusqueda] = useState("");
  const [estadosDisponibles, setEstadosDisponibles] = useState<
    EstadoInscripcion[]
  >([]);

  // Función para manejar cambios de estado
  const handleEstadoChange = useCallback(
    (inscripcionId: number, nuevoEstado: EstadoInscripcion) => {
      if (!data) return;

      // Actualizar el estado local
      const estudiantesActualizados = data.estudiantes.map((estudiante) => {
        if (estudiante.inscripcion.id === inscripcionId) {
          return {
            ...estudiante,
            inscripcion: {
              ...estudiante.inscripcion,
              estado: nuevoEstado,
            },
          };
        }
        return estudiante;
      });

      setData({
        ...data,
        estudiantes: estudiantesActualizados,
      });
    },
    [data]
  );

  // Definición de columnas para la tabla
  const columns = useMemo<ColumnDef<EstudianteInscrito, unknown>[]>(
    () => [
      {
        id: "estudiante",
        header: "Estudiante",
        accessorFn: (row) =>
          `${row.estudiante.nombres} ${row.estudiante.apellidos}`,
        cell: ({ row }) => (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Icon icon="solar:user-bold" className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-midnight_text dark:text-white">
                {row.original.estudiante.nombres}{" "}
                {row.original.estudiante.apellidos}
              </p>
              <p className="text-sm text-dark_grey dark:text-gray-400">
                {row.original.estudiante.cedula}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "contacto",
        header: "Contacto",
        accessorFn: (row) => row.estudiante.correo,
        cell: ({ row }) => (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon
                icon="solar:letter-linear"
                className="w-4 h-4 text-dark_grey dark:text-gray-400"
              />
              <span className="text-sm text-midnight_text dark:text-white">
                {row.original.estudiante.correo}
              </span>
              {row.original.estudiante.correo_verificado && (
                <Icon
                  icon="solar:check-circle-bold"
                  className="w-4 h-4 text-success"
                />
              )}
            </div>
            <div className="flex items-center gap-2">
              <Icon
                icon="solar:phone-linear"
                className="w-4 h-4 text-dark_grey dark:text-gray-400"
              />
              <span className="text-sm text-midnight_text dark:text-white">
                {row.original.estudiante.telefono}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "estado",
        header: "Estado",
        accessorFn: (row) => row.inscripcion.estado.nombre,
        cell: ({ row }) => (
          <EstadoSelector
            inscripcionId={row.original.inscripcion.id}
            estadoActual={row.original.inscripcion.estado}
            estadosDisponibles={estadosDisponibles}
            onEstadoChange={handleEstadoChange}
          />
        ),
      },
      {
        id: "ubicacion",
        header: "Ubicación",
        accessorFn: (row) => row.ubicacion?.provincia.nombre || "",
        cell: ({ row }) => (
          <div>
            {row.original.ubicacion && (
              <div className="text-sm text-midnight_text dark:text-white">
                <p>{row.original.ubicacion.provincia.nombre}</p>
                {row.original.ubicacion.distrito && (
                  <p className="text-dark_grey dark:text-gray-400">
                    {row.original.ubicacion.distrito.nombre}
                    {row.original.ubicacion.corregimiento &&
                      `, ${row.original.ubicacion.corregimiento.nombre}`}
                  </p>
                )}
              </div>
            )}
          </div>
        ),
      },
      {
        id: "fecha_inscripcion",
        header: "Fecha Inscripción",
        accessorFn: (row) => row.inscripcion.fecha_inscripcion,
        cell: ({ row }) => (
          <span className="text-sm text-midnight_text dark:text-white">
            {formatFecha(row.original.inscripcion.fecha_inscripcion)}
          </span>
        ),
      },
    ],
    [estadosDisponibles, handleEstadoChange]
  );

  useEffect(() => {
    const fetchDetallesCapacitacion = async () => {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const response = await fetch(
          `${basePath}/api/admin/capacitaciones/${capacitacionId}/estudiantes`
        );

        if (!response.ok) {
          throw new Error("Error al cargar los datos");
        }

        const result: ApiResponse = await response.json();
        setData(result.data);
      } catch (error) {
        console.error("Error fetching datos:", error);
        setError("Error al cargar los datos de la capacitación");
        toast.error("Error al cargar los datos");
      } finally {
        setLoading(false);
      }
    };

    fetchDetallesCapacitacion();
  }, [capacitacionId]);

  // Cargar estados disponibles
  useEffect(() => {
    const fetchEstados = async () => {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const response = await fetch(
          `${basePath}/api/admin/inscripciones/estados`
        );

        if (!response.ok) {
          throw new Error("Error al cargar los estados");
        }

        const result = await response.json();
        if (result.success) {
          setEstadosDisponibles(result.data);
        }
      } catch (error) {
        console.error("Error fetching estados:", error);
        toast.error("Error al cargar los estados");
      }
    };

    fetchEstados();
  }, []);

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filtrar estudiantes
  const estudiantesFiltrados =
    data?.estudiantes.filter((item) => {
      const coincideBusqueda =
        item.estudiante.nombres
          .toLowerCase()
          .includes(busqueda.toLowerCase()) ||
        item.estudiante.apellidos
          .toLowerCase()
          .includes(busqueda.toLowerCase()) ||
        item.estudiante.cedula.includes(busqueda) ||
        item.estudiante.correo.toLowerCase().includes(busqueda.toLowerCase());

      const coincideEstado =
        filtroEstado === "todos" ||
        item.inscripcion.estado.nombre.toLowerCase() === filtroEstado;

      return coincideBusqueda && coincideEstado;
    }) || [];

  if (loading) {
    return (
      <AdminProtection>
        <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
            <p className="mt-6 text-midnight_text dark:text-white text-lg font-medium">
              Cargando detalles...
            </p>
          </div>
        </div>
      </AdminProtection>
    );
  }

  if (error || !data) {
    return (
      <AdminProtection>
        <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 max-w-md">
            <Icon
              icon="solar:danger-circle-bold"
              className="text-red-500 text-6xl mx-auto mb-4"
            />
            <p className="text-midnight_text dark:text-white mb-6 text-lg">
              {error || "No se pudieron cargar los datos"}
            </p>
            <button
              onClick={() => router.push("/admin/capacitaciones")}
              className="px-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-colors"
            >
              Volver a Capacitaciones
            </button>
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
          <div className="flex justify-between items-start mb-8">
            <div>
              <button
                onClick={() => router.push("/admin/capacitaciones")}
                className="flex items-center text-midnight_text dark:text-white hover:text-primary dark:hover:text-primary transition-colors font-medium group mb-4"
              >
                <Icon
                  icon="solar:alt-arrow-left-linear"
                  className="w-6 h-6 mr-2 group-hover:-translate-x-1 transition-transform"
                />
                Volver a Capacitaciones
              </button>
              <h1 className="text-3xl font-bold text-midnight_text dark:text-white mb-2">
                {data.capacitacion.nombre}
              </h1>
              <p className="text-dark_grey dark:text-gray-300">
                Gestión de estudiantes inscritos
              </p>
            </div>
          </div>

          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Icon
                    icon="solar:users-group-rounded-bold"
                    className="w-6 h-6 text-primary"
                  />
                </div>
                <div>
                  <p className="text-2xl font-bold text-midnight_text dark:text-white">
                    {data.totales.total_inscritos}
                  </p>
                  <p className="text-sm text-dark_grey dark:text-gray-400">
                    Total Inscritos
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-success/10 rounded-xl flex items-center justify-center">
                  <Icon
                    icon="solar:check-circle-bold"
                    className="w-6 h-6 text-success"
                  />
                </div>
                <div>
                  <p className="text-2xl font-bold text-midnight_text dark:text-white">
                    {data.estadisticas.matriculado?.cantidad || 0}
                  </p>
                  <p className="text-sm text-dark_grey dark:text-gray-400">
                    Matriculados
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
                  <Icon
                    icon="solar:close-circle-bold"
                    className="w-6 h-6 text-red-600 dark:text-red-400"
                  />
                </div>
                <div>
                  <p className="text-2xl font-bold text-midnight_text dark:text-white">
                    {data.estadisticas.rechazado?.cantidad || 0}
                  </p>
                  <p className="text-sm text-dark_grey dark:text-gray-400">
                    Rechazados
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-xl flex items-center justify-center">
                  <Icon
                    icon="solar:diploma-bold"
                    className="w-6 h-6 text-green-600 dark:text-green-400"
                  />
                </div>
                <div>
                  <p className="text-2xl font-bold text-midnight_text dark:text-white">
                    {data.estadisticas["terminó_curso"]?.cantidad || 0}
                  </p>
                  <p className="text-sm text-dark_grey dark:text-gray-400">
                    Terminaron
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros adicionales */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-8">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Filtro por estado */}
              <div className="sm:w-48">
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="w-full py-3 px-4 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white dark:bg-gray-700 text-midnight_text dark:text-white"
                >
                  <option value="todos">Todos los estados</option>
                  {Object.values(data.estadisticas).map((estado) => (
                    <option key={estado.id} value={estado.nombre.toLowerCase()}>
                      {estado.nombre} ({estado.cantidad})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Tabla de estudiantes con el nuevo componente */}
          <Table
            data={estudiantesFiltrados}
            columns={columns}
            searchValue={busqueda}
            onSearchChange={setBusqueda}
            searchPlaceholder="Buscar por nombre, cédula o correo..."
            title={`Estudiantes Inscritos (${estudiantesFiltrados.length})`}
            emptyMessage={
              busqueda || filtroEstado !== "todos"
                ? "No se encontraron estudiantes con los filtros aplicados"
                : "No hay estudiantes inscritos en esta capacitación"
            }
            emptyIcon="solar:users-group-rounded-linear"
            enableSorting={true}
            enablePagination={true}
            pageSize={10}
          />
        </div>
      </div>
    </AdminProtection>
  );
}
