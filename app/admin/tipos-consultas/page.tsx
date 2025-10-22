"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Table from "@/components/Table";
import type { ColumnDef } from "@tanstack/react-table";

interface TipoConsulta {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export default function TiposConsultaAdminPage() {
  const router = useRouter();
  const [tipos, setTipos] = useState<TipoConsulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTipo, setEditingTipo] = useState<TipoConsulta | null>(null);
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [activo, setActivo] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTipos();
  }, []);

  const fetchTipos = async () => {
    try {
      setLoading(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/tipos-consultas`);

      if (!response.ok) {
        throw new Error("Error al cargar tipos de consulta");
      }

      const data = await response.json();
      setTipos(data.data);
    } catch (error) {
      console.error("Error fetching tipos:", error);
      toast.error("Error al cargar los tipos de consulta");
    } finally {
      setLoading(false);
    }
  };

  const handleNuevo = () => {
    setEditingTipo(null);
    setNombre("");
    setDescripcion("");
    setActivo(true);
    setShowModal(true);
  };

  const handleEditar = (tipo: TipoConsulta) => {
    setEditingTipo(tipo);
    setNombre(tipo.nombre);
    setDescripcion(tipo.descripcion || "");
    setActivo(tipo.activo);
    setShowModal(true);
  };

  const handleGuardar = async () => {
    if (!nombre.trim()) {
      toast.error("El nombre es obligatorio");
      return;
    }

    setIsSubmitting(true);

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const url = editingTipo
        ? `${basePath}/api/admin/tipos-consultas/${editingTipo.id}`
        : `${basePath}/api/admin/tipos-consultas`;

      const response = await fetch(url, {
        method: editingTipo ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre,
          descripcion: descripcion || null,
          activo,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al guardar");
      }

      toast.success(
        editingTipo
          ? "Tipo de consulta actualizado exitosamente"
          : "Tipo de consulta creado exitosamente"
      );
      setShowModal(false);
      fetchTipos();
    } catch (error) {
      console.error("Error guardando tipo:", error);
      toast.error(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (
      !confirm(
        "¿Estás seguro de que deseas eliminar este tipo de consulta? Esta acción no se puede deshacer."
      )
    ) {
      return;
    }

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(
        `${basePath}/api/admin/tipos-consultas/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al eliminar");
      }

      toast.success("Tipo de consulta eliminado exitosamente");
      fetchTipos();
    } catch (error) {
      console.error("Error eliminando tipo:", error);
      toast.error(error instanceof Error ? error.message : "Error al eliminar");
    }
  };

  const columns: ColumnDef<TipoConsulta>[] = [
    {
      accessorKey: "id",
      header: "ID",
      cell: ({ row }) => (
        <span className="font-mono text-sm">{row.original.id}</span>
      ),
    },
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-midnight_text dark:text-white">
            {row.original.nombre}
          </div>
          {row.original.descripcion && (
            <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
              {row.original.descripcion}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "activo",
      header: "Estado",
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-semibold ${
            row.original.activo
              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
              : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
          }`}
        >
          {row.original.activo ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      accessorKey: "fecha_creacion",
      header: "Creado",
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.original.fecha_creacion).toLocaleDateString("es-PA")}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditar(row.original)}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Editar"
          >
            <Icon icon="solar:pen-linear" className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleEliminar(row.original.id)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Icon icon="solar:trash-bin-trash-linear" className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-midnight_text dark:text-white mb-2">
              Tipos de Consulta
            </h1>
            <p className="text-dark_grey dark:text-gray-400">
              Gestiona los tipos de consulta disponibles en el formulario
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/admin/consultas")}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <Icon icon="solar:arrow-left-linear" className="w-5 h-5" />
              Volver a Consultas
            </button>
            <button
              onClick={handleNuevo}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Icon icon="solar:add-circle-linear" className="w-5 h-5" />
              Nuevo Tipo
            </button>
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
            <p className="mt-4 text-dark_grey dark:text-gray-400">
              Cargando tipos de consulta...
            </p>
          </div>
        ) : (
          <Table
            data={tipos}
            columns={columns}
            enableSorting
            searchPlaceholder="Buscar tipos..."
          />
        )}
      </div>

      {/* Modal Crear/Editar */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-midnight_text dark:text-white">
                  {editingTipo
                    ? "Editar Tipo de Consulta"
                    : "Nuevo Tipo de Consulta"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Icon icon="solar:close-circle-linear" className="w-6 h-6" />
                </button>
              </div>

              {/* Formulario */}
              <div className="space-y-4 mb-6">
                {/* Nombre */}
                <div>
                  <label className="block text-sm font-semibold text-midnight_text dark:text-white mb-2">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Consulta General, Soporte Técnico, etc."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-midnight_text dark:text-white focus:ring-2 focus:ring-primary"
                  />
                </div>

                {/* Descripción */}
                <div>
                  <label className="block text-sm font-semibold text-midnight_text dark:text-white mb-2">
                    Descripción
                  </label>
                  <textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    rows={3}
                    placeholder="Descripción opcional del tipo de consulta..."
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-midnight_text dark:text-white focus:ring-2 focus:ring-primary resize-none"
                  />
                </div>

                {/* Activo */}
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="activo"
                    checked={activo}
                    onChange={(e) => setActivo(e.target.checked)}
                    className="w-5 h-5 text-primary bg-gray-100 border-gray-300 rounded focus:ring-primary focus:ring-2"
                  />
                  <label
                    htmlFor="activo"
                    className="text-sm font-medium text-midnight_text dark:text-white cursor-pointer"
                  >
                    Activo (visible en el formulario público)
                  </label>
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3">
                <button
                  onClick={handleGuardar}
                  disabled={isSubmitting}
                  className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2 ${
                    isSubmitting
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-primary hover:bg-primary/90 text-white"
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:diskette-linear" className="w-5 h-5" />
                      {editingTipo ? "Actualizar" : "Crear"}
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg font-semibold text-midnight_text dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
