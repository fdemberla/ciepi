"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Table from "@/components/Table";
import type { ColumnDef } from "@tanstack/react-table";

interface Blog {
  id: string;
  titulo: string;
  imagen_banner: string | null;
  palabras_clave: string[];
  creado_por: string;
  autor_nombre: string;
  creado_en: string;
  estado: number;
  estado_nombre: string;
  aprobado_por: string | null;
  aprobado_por_nombre: string | null;
  aprobado_en: string | null;
}

export default function AprobarBlogsPage() {
  const router = useRouter();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<
    "todos" | "pendientes" | "revision"
  >("pendientes");

  useEffect(() => {
    const loadBlogs = async () => {
      try {
        setLoading(true);
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

        // Filtrar según el estado seleccionado
        let estadoFilter = "";
        if (selectedFilter === "pendientes") {
          estadoFilter = "&estado=2,4"; // En Revisión CIEPI o RR.PP
        } else if (selectedFilter === "revision") {
          estadoFilter = "&estado=2,3,4,5"; // Todos los estados de revisión
        }

        const response = await fetch(
          `${basePath}/api/admin/blog?limit=100${estadoFilter}`
        );

        if (!response.ok) {
          throw new Error("Error al cargar blogs");
        }

        const data = await response.json();
        setBlogs(data.data);
      } catch (error) {
        console.error("Error fetching blogs:", error);
        toast.error("Error al cargar los blogs");
      } finally {
        setLoading(false);
      }
    };

    loadBlogs();
  }, [selectedFilter]);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

      // Filtrar según el estado seleccionado
      let estadoFilter = "";
      if (selectedFilter === "pendientes") {
        estadoFilter = "&estado=2,4"; // En Revisión CIEPI o RR.PP
      } else if (selectedFilter === "revision") {
        estadoFilter = "&estado=2,3,4,5"; // Todos los estados de revisión
      }

      const response = await fetch(
        `${basePath}/api/admin/blog?limit=100${estadoFilter}`
      );

      if (!response.ok) {
        throw new Error("Error al cargar blogs");
      }

      const data = await response.json();
      setBlogs(data.data);
    } catch (error) {
      console.error("Error fetching blogs:", error);
      toast.error("Error al cargar los blogs");
    } finally {
      setLoading(false);
    }
  };

  const handleEstadoChange = async (
    blogId: string,
    nuevoEstado: number,
    comentario?: string
  ) => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/blog/${blogId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estado: nuevoEstado,
          comentario_temp: comentario,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al cambiar estado");
      }

      toast.success("Estado del blog actualizado exitosamente");
      fetchBlogs();
    } catch (error) {
      console.error("Error cambiando estado:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al cambiar estado"
      );
    }
  };

  const getEstadoBadge = (estado: number, estadoNombre: string) => {
    const badges = {
      1: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300", // Borrador
      2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", // En Revisión CIEPI
      3: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", // Rechazado por CIEPI
      4: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300", // En Revisión RR.PP
      5: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", // Rechazado por RR.PP
      6: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", // Publicado
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${
          badges[estado as keyof typeof badges]
        }`}
      >
        {estadoNombre}
      </span>
    );
  };

  const AccionesCell = ({ blog }: { blog: Blog }) => {
    const [showModal, setShowModal] = useState(false);
    const [comentario, setComentario] = useState("");
    const [accionSeleccionada, setAccionSeleccionada] = useState<{
      tipo: string;
      estado: number;
    } | null>(null);

    const abrirModal = (tipo: string, estado: number) => {
      setAccionSeleccionada({ tipo, estado });
      setComentario("");
      setShowModal(true);
    };

    const confirmarAccion = () => {
      if (accionSeleccionada) {
        handleEstadoChange(blog.id, accionSeleccionada.estado, comentario);
        setShowModal(false);
        setAccionSeleccionada(null);
        setComentario("");
      }
    };

    const getAccionesDisponibles = () => {
      const acciones = [];

      if (blog.estado === 2) {
        // En Revisión CIEPI
        acciones.push(
          <button
            key="aprobar-ciepi"
            onClick={() => abrirModal("Aprobar para RR.PP", 4)}
            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
            title="Aprobar y enviar a RR.PP"
          >
            <Icon icon="solar:check-circle-linear" className="w-5 h-5" />
          </button>
        );
        acciones.push(
          <button
            key="rechazar-ciepi"
            onClick={() => abrirModal("Rechazar", 3)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Rechazar blog"
          >
            <Icon icon="solar:close-circle-linear" className="w-5 h-5" />
          </button>
        );
      }

      if (blog.estado === 4) {
        // En Revisión RR.PP
        acciones.push(
          <button
            key="aprobar-detallado"
            onClick={() => router.push(`/admin/blog/aprobar/${blog.id}`)}
            className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors"
            title="Revisar y aprobar detalladamente"
          >
            <Icon icon="solar:document-check-linear" className="w-5 h-5" />
          </button>
        );
        acciones.push(
          <button
            key="publicar"
            onClick={() => abrirModal("Publicar", 6)}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Publicar directamente"
          >
            <Icon icon="solar:verified-check-linear" className="w-5 h-5" />
          </button>
        );
        acciones.push(
          <button
            key="rechazar-rrpp"
            onClick={() => abrirModal("Rechazar", 5)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Rechazar blog"
          >
            <Icon icon="solar:close-circle-linear" className="w-5 h-5" />
          </button>
        );
      }

      // Acción de reenviar para blogs rechazados
      if (blog.estado === 3 || blog.estado === 5) {
        acciones.push(
          <button
            key="reenviar"
            onClick={() =>
              abrirModal("Reenviar a revisión", blog.estado === 3 ? 2 : 4)
            }
            className="p-2 text-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-900/20 rounded-lg transition-colors"
            title="Reenviar a revisión"
          >
            <Icon icon="solar:refresh-linear" className="w-5 h-5" />
          </button>
        );
      }

      return acciones;
    };

    return (
      <>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/admin/blog/editar/${blog.id}`)}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Ver/Editar blog"
          >
            <Icon icon="solar:eye-linear" className="w-5 h-5" />
          </button>
          {getAccionesDisponibles()}
        </div>

        {/* Modal de confirmación */}
        {showModal && accionSeleccionada && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-midnight_text dark:text-white mb-4">
                {accionSeleccionada.tipo}
              </h3>
              <p className="text-dark_grey dark:text-gray-400 mb-4">
                ¿Estás seguro de que deseas{" "}
                {accionSeleccionada.tipo.toLowerCase()} el blog &ldquo;
                {blog.titulo}&rdquo;?
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-midnight_text dark:text-white mb-2">
                  Comentario (opcional)
                </label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Agregar comentario sobre esta acción..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-midnight_text dark:text-white resize-none"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-midnight_text dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarAccion}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const columns: ColumnDef<Blog>[] = [
    {
      accessorKey: "titulo",
      header: "Blog",
      cell: ({ row }) => (
        <div className="max-w-xs">
          <div className="font-medium text-midnight_text dark:text-white truncate">
            {row.original.titulo}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 truncate">
            por {row.original.autor_nombre}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) =>
        getEstadoBadge(row.original.estado, row.original.estado_nombre),
    },
    {
      accessorKey: "creado_en",
      header: "Fecha",
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.original.creado_en).toLocaleDateString("es-PA")}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => <AccionesCell blog={row.original} />,
    },
  ];

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-midnight_text dark:text-white mb-2">
              Aprobar Blogs
            </h1>
            <p className="text-dark_grey dark:text-gray-400">
              Gestiona la aprobación y revisión de entradas de blog
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/blog")}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <Icon icon="solar:arrow-left-linear" className="w-5 h-5" />
            Volver al listado
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-semibold text-midnight_text dark:text-white mb-4">
            Filtrar blogs
          </h3>
          <div className="flex gap-4">
            <button
              onClick={() => setSelectedFilter("pendientes")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedFilter === "pendientes"
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-midnight_text dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Pendientes de aprobación
            </button>
            <button
              onClick={() => setSelectedFilter("revision")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedFilter === "revision"
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-midnight_text dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              En proceso de revisión
            </button>
            <button
              onClick={() => setSelectedFilter("todos")}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedFilter === "todos"
                  ? "bg-primary text-white"
                  : "bg-gray-100 dark:bg-gray-700 text-midnight_text dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              Todos los blogs
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  En Revisión CIEPI
                </p>
                <p className="text-2xl font-bold text-midnight_text dark:text-white">
                  {blogs.filter((b) => b.estado === 2).length}
                </p>
              </div>
              <Icon icon="solar:eye-linear" className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  En Revisión RR.PP
                </p>
                <p className="text-2xl font-bold text-midnight_text dark:text-white">
                  {blogs.filter((b) => b.estado === 4).length}
                </p>
              </div>
              <Icon
                icon="solar:check-circle-linear"
                className="w-8 h-8 text-purple-400"
              />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Rechazados
                </p>
                <p className="text-2xl font-bold text-midnight_text dark:text-white">
                  {blogs.filter((b) => [3, 5].includes(b.estado)).length}
                </p>
              </div>
              <Icon
                icon="solar:close-circle-linear"
                className="w-8 h-8 text-red-400"
              />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Publicados
                </p>
                <p className="text-2xl font-bold text-midnight_text dark:text-white">
                  {blogs.filter((b) => b.estado === 6).length}
                </p>
              </div>
              <Icon
                icon="solar:verified-check-linear"
                className="w-8 h-8 text-green-400"
              />
            </div>
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
            <p className="mt-4 text-dark_grey dark:text-gray-400">
              Cargando blogs...
            </p>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-12">
            <Icon
              icon="solar:document-linear"
              className="w-16 h-16 text-gray-400 mx-auto mb-4"
            />
            <h3 className="text-lg font-semibold text-midnight_text dark:text-white mb-2">
              No hay blogs para mostrar
            </h3>
            <p className="text-dark_grey dark:text-gray-400">
              No se encontraron blogs que coincidan con el filtro seleccionado.
            </p>
          </div>
        ) : (
          <Table
            data={blogs}
            columns={columns}
            enableSorting
            enablePagination
            searchPlaceholder="Buscar por título..."
          />
        )}
      </div>
    </div>
  );
}
