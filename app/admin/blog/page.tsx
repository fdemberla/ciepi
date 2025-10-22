"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Table from "@/components/Table";
import {
  canEditBlog,
  canDeleteBlog,
  canChangeToState,
} from "@/lib/permissions-client";
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

export default function BlogAdminPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const userRole = session?.user?.rolId || 0;
  const userId = session?.user?.adminId || "";

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/blog?limit=100`);

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

  const handleEliminar = async (id: string, titulo: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el blog "${titulo}"?`)) {
      return;
    }

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/blog/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar blog");
      }

      toast.success("Blog eliminado exitosamente");
      fetchBlogs();
    } catch (error) {
      console.error("Error eliminando blog:", error);
      toast.error("Error al eliminar el blog");
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

  const columns: ColumnDef<Blog>[] = [
    {
      accessorKey: "titulo",
      header: "Título",
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
      accessorKey: "palabras_clave",
      header: "Palabras Clave",
      cell: ({ row }) => (
        <div className="max-w-xs">
          {row.original.palabras_clave.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {row.original.palabras_clave.slice(0, 3).map((palabra, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-xs rounded"
                >
                  {palabra}
                </span>
              ))}
              {row.original.palabras_clave.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{row.original.palabras_clave.length - 3} más
                </span>
              )}
            </div>
          ) : (
            <span className="text-gray-400 text-sm">Sin palabras clave</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: "creado_en",
      header: "Creado",
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.original.creado_en).toLocaleDateString("es-PA")}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => {
        const isCreator = row.original.creado_por === userId;
        const canEdit = isCreator && canEditBlog(userRole);
        const canDelete = canDeleteBlog(userRole);
        const canApprove =
          row.original.estado > 1 &&
          canChangeToState(userRole, row.original.estado);

        return (
          <div className="flex gap-2">
            {canEdit && (
              <button
                onClick={() =>
                  router.push(`/admin/blog/editar/${row.original.id}`)
                }
                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                title="Editar blog"
              >
                <Icon icon="solar:pen-linear" className="w-5 h-5" />
              </button>
            )}
            {canApprove && (
              <button
                onClick={() =>
                  router.push(`/admin/blog/aprobar/${row.original.id}`)
                }
                className="p-2 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
                title="Gestionar aprobación"
              >
                <Icon icon="solar:check-circle-linear" className="w-5 h-5" />
              </button>
            )}
            {canDelete && (
              <button
                onClick={() =>
                  handleEliminar(row.original.id, row.original.titulo)
                }
                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Eliminar blog"
              >
                <Icon icon="solar:trash-bin-trash-linear" className="w-5 h-5" />
              </button>
            )}
            {!canEdit && !canApprove && !canDelete && (
              <span className="text-xs text-gray-400 px-2 py-2">
                Sin permisos
              </span>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-midnight_text dark:text-white mb-2">
              Gestión de Blog
            </h1>
            <p className="text-dark_grey dark:text-gray-400">
              Administra las entradas del blog, desde borradores hasta
              publicaciones
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/admin/blog/aprobar")}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Icon icon="solar:check-circle-linear" className="w-5 h-5" />
              Aprobar Blogs
            </button>
            <button
              onClick={() => router.push("/admin/blog/crear")}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Icon icon="solar:add-circle-linear" className="w-5 h-5" />
              Crear Blog
            </button>
          </div>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Total Borradores
                </p>
                <p className="text-2xl font-bold text-midnight_text dark:text-white">
                  {blogs.filter((b) => b.estado === 1).length}
                </p>
              </div>
              <Icon
                icon="solar:document-linear"
                className="w-8 h-8 text-gray-400"
              />
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  En Revisión
                </p>
                <p className="text-2xl font-bold text-midnight_text dark:text-white">
                  {blogs.filter((b) => [2, 4].includes(b.estado)).length}
                </p>
              </div>
              <Icon icon="solar:eye-linear" className="w-8 h-8 text-blue-400" />
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
