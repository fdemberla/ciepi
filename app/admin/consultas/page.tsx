"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Table from "@/components/Table";
import type { ColumnDef } from "@tanstack/react-table";

interface Consulta {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  tipo_consulta: string | null;
  sede: string | null;
  area_formacion: string | null;
  curso_interes: string | null;
  comentarios: string;
  respuesta: string | null;
  respondido_por_nombre: string | null;
  fecha_respuesta: string | null;
  estado: "pendiente" | "en_proceso" | "respondida" | "cerrada";
  fecha_creacion: string;
}

export default function ConsultasAdminPage() {
  const router = useRouter();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConsulta, setSelectedConsulta] = useState<Consulta | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [respuesta, setRespuesta] = useState("");
  const [nuevoEstado, setNuevoEstado] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchConsultas();
  }, []);

  const fetchConsultas = async () => {
    try {
      setLoading(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/consultas?limit=100`);

      if (!response.ok) {
        throw new Error("Error al cargar consultas");
      }

      const data = await response.json();
      setConsultas(data.data);
    } catch (error) {
      console.error("Error fetching consultas:", error);
      toast.error("Error al cargar las consultas");
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalles = (consulta: Consulta) => {
    setSelectedConsulta(consulta);
    setRespuesta(consulta.respuesta || "");
    setNuevoEstado(consulta.estado);
    setShowModal(true);
  };

  const handleResponder = async () => {
    if (!selectedConsulta) return;

    if (!respuesta.trim()) {
      toast.error("Debes escribir una respuesta");
      return;
    }

    setIsSubmitting(true);

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(
        `${basePath}/api/admin/consultas/${selectedConsulta.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            respuesta,
            estado: nuevoEstado,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Error al responder consulta");
      }

      toast.success("Respuesta enviada exitosamente");
      setShowModal(false);
      fetchConsultas();
    } catch (error) {
      console.error("Error respondiendo consulta:", error);
      toast.error("Error al enviar la respuesta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta consulta?")) {
      return;
    }

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/consultas/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error al eliminar consulta");
      }

      toast.success("Consulta eliminada exitosamente");
      fetchConsultas();
    } catch (error) {
      console.error("Error eliminando consulta:", error);
      toast.error("Error al eliminar la consulta");
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges = {
      pendiente: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      en_proceso: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      respondida: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      cerrada: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };

    const labels = {
      pendiente: "Pendiente",
      en_proceso: "En Proceso",
      respondida: "Respondida",
      cerrada: "Cerrada",
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${badges[estado as keyof typeof badges]}`}>
        {labels[estado as keyof typeof labels]}
      </span>
    );
  };

  const columns: ColumnDef<Consulta>[] = [
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
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {row.original.email}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "tipo_consulta",
      header: "Tipo",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.tipo_consulta || "Sin tipo"}
        </span>
      ),
    },
    {
      accessorKey: "estado",
      header: "Estado",
      cell: ({ row }) => getEstadoBadge(row.original.estado),
    },
    {
      accessorKey: "fecha_creacion",
      header: "Fecha",
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
            onClick={() => handleVerDetalles(row.original)}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Ver detalles y responder"
          >
            <Icon icon="solar:eye-linear" className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleEliminar(row.original.id)}
            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Eliminar consulta"
          >
            <Icon icon="solar:trash-bin-trash-linear" className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-midnight_text dark:text-white mb-2">
              Gestión de Consultas
            </h1>
            <p className="text-dark_grey dark:text-gray-400">
              Administra y responde las consultas de contacto
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/tipos-consultas")}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Icon icon="solar:settings-linear" className="w-5 h-5" />
            Gestionar Tipos
          </button>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
            <p className="mt-4 text-dark_grey dark:text-gray-400">
              Cargando consultas...
            </p>
          </div>
        ) : (
          <Table
            data={consultas}
            columns={columns}
            enableSorting
            enablePagination
            searchPlaceholder="Buscar por nombre, email..."
          />
        )}
      </div>

      {/* Modal de Detalles/Respuesta */}
      {showModal && selectedConsulta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-midnight_text dark:text-white">
                    Detalles de la Consulta
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    ID: {selectedConsulta.id}
                  </p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Icon icon="solar:close-circle-linear" className="w-6 h-6" />
                </button>
              </div>

              {/* Información del consultante */}
              <div className="bg-slateGray dark:bg-gray-700 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-midnight_text dark:text-white mb-3">
                  Información del Consultante
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Nombre
                    </p>
                    <p className="text-sm font-medium text-midnight_text dark:text-white">
                      {selectedConsulta.nombre}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Email
                    </p>
                    <p className="text-sm font-medium text-midnight_text dark:text-white">
                      {selectedConsulta.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Teléfono
                    </p>
                    <p className="text-sm font-medium text-midnight_text dark:text-white">
                      {selectedConsulta.telefono}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Tipo de Consulta
                    </p>
                    <p className="text-sm font-medium text-midnight_text dark:text-white">
                      {selectedConsulta.tipo_consulta || "Sin especificar"}
                    </p>
                  </div>
                  {selectedConsulta.sede && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Sede
                      </p>
                      <p className="text-sm font-medium text-midnight_text dark:text-white">
                        {selectedConsulta.sede}
                      </p>
                    </div>
                  )}
                  {selectedConsulta.area_formacion && (
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Área de Formación
                      </p>
                      <p className="text-sm font-medium text-midnight_text dark:text-white">
                        {selectedConsulta.area_formacion}
                      </p>
                    </div>
                  )}
                  {selectedConsulta.curso_interes && (
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                        Curso de Interés
                      </p>
                      <p className="text-sm font-medium text-midnight_text dark:text-white">
                        {selectedConsulta.curso_interes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Comentarios */}
              <div className="mb-6">
                <h3 className="font-semibold text-midnight_text dark:text-white mb-2">
                  Comentarios
                </h3>
                <div className="bg-slateGray dark:bg-gray-700 rounded-lg p-4">
                  <p className="text-sm text-midnight_text dark:text-white whitespace-pre-wrap">
                    {selectedConsulta.comentarios}
                  </p>
                </div>
              </div>

              {/* Estado */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-midnight_text dark:text-white mb-2">
                  Estado
                </label>
                <select
                  value={nuevoEstado}
                  onChange={(e) => setNuevoEstado(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-midnight_text dark:text-white focus:ring-2 focus:ring-primary"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_proceso">En Proceso</option>
                  <option value="respondida">Respondida</option>
                  <option value="cerrada">Cerrada</option>
                </select>
              </div>

              {/* Respuesta */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-midnight_text dark:text-white mb-2">
                  Respuesta
                </label>
                <textarea
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                  rows={6}
                  placeholder="Escribe tu respuesta aquí..."
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-midnight_text dark:text-white focus:ring-2 focus:ring-primary resize-none"
                />
                {selectedConsulta.fecha_respuesta && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    Respondida por {selectedConsulta.respondido_por_nombre || "Admin"} el{" "}
                    {new Date(selectedConsulta.fecha_respuesta).toLocaleString("es-PA")}
                  </p>
                )}
              </div>

              {/* Acciones */}
              <div className="flex gap-3">
                <button
                  onClick={handleResponder}
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
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Icon icon="solar:plain-2-linear" className="w-5 h-5" />
                      Enviar Respuesta
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
