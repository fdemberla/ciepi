"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Icon } from "@iconify/react";

interface Evento {
  id: number;
  nombre: string;
  descripcion: unknown;
  fecha_inicio: string;
  fecha_fin: string;
  ubicacion: string | null;
  banner: string | null;
  galeria: unknown;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

const EventosPage = () => {
  const router = useRouter();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventoToDelete, setEventoToDelete] = useState<Evento | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchEventos();
  }, []);

  const fetchEventos = async () => {
    try {
      setLoading(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/eventos`);

      if (!response.ok) {
        throw new Error("Error al cargar eventos");
      }

      const data = await response.json();
      setEventos(data.data || []);
    } catch (err) {
      console.error("Error fetching eventos:", err);
      setError(err instanceof Error ? err.message : "Error al cargar eventos");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("es-PA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleCrear = () => {
    router.push("/admin/eventos/crear");
  };

  const handleEditar = (id: number) => {
    router.push(`/admin/eventos/editar/${id}`);
  };

  const handleDeleteClick = (evento: Evento) => {
    setEventoToDelete(evento);
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!eventoToDelete) return;

    try {
      setDeleting(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(
        `${basePath}/api/admin/eventos/${eventoToDelete.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error("Error al eliminar evento");
      }

      setShowDeleteModal(false);
      setEventoToDelete(null);
      await fetchEventos();
    } catch (err) {
      console.error("Error deleting evento:", err);
      setError(err instanceof Error ? err.message : "Error al eliminar evento");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#1A21BC]/20 border-t-[#1A21BC]"></div>
          <p className="mt-6 text-midnight_text dark:text-white text-lg font-medium">
            Cargando eventos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="bg-slateGray dark:bg-gray-900 min-h-screen pt-32 pb-20">
      <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4">
        {/* Header */}
        <div className="mb-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl sm:text-5xl font-bold text-midnight_text dark:text-white mb-2">
              Gestión de Eventos
            </h1>
            <p className="text-dark_grey dark:text-gray-400">
              Total de eventos: {eventos.length}
            </p>
          </div>
          <button
            onClick={handleCrear}
            className="flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-full hover:bg-primary/90 transition-all duration-300 shadow-lg font-semibold"
          >
            <Icon icon="solar:add-circle-linear" className="w-6 h-6" />
            Crear Evento
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-8 p-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 rounded-lg">
            <p className="text-red-700 dark:text-red-400 font-medium">
              {error}
            </p>
          </div>
        )}

        {/* Events Table */}
        {eventos.length === 0 ? (
          <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-3xl shadow-lg">
            <Icon
              icon="solar:calendar-linear"
              className="text-dark_grey dark:text-gray-400 text-8xl mx-auto mb-6 opacity-30"
            />
            <h3 className="text-2xl font-bold text-midnight_text dark:text-white mb-3">
              No hay eventos registrados
            </h3>
            <p className="text-dark_grey dark:text-gray-400 text-lg mb-8">
              Crea tu primer evento para comenzar
            </p>
            <button
              onClick={handleCrear}
              className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white rounded-full hover:bg-primary/90 transition-all duration-300 shadow-lg font-semibold"
            >
              <Icon icon="solar:add-circle-linear" className="w-6 h-6" />
              Crear Evento
            </button>
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slateGray dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
                    <th className="px-6 py-4 text-left text-sm font-bold text-midnight_text dark:text-white">
                      Nombre
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-midnight_text dark:text-white">
                      Ubicación
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-midnight_text dark:text-white">
                      Inicio
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-bold text-midnight_text dark:text-white">
                      Fin
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-bold text-midnight_text dark:text-white">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {eventos.map((evento, index) => (
                    <tr
                      key={evento.id}
                      className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                        index % 2 === 0
                          ? "bg-white dark:bg-gray-800"
                          : "bg-gray-50 dark:bg-gray-800/50"
                      }`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div>
                            <p className="font-semibold text-midnight_text dark:text-white">
                              {evento.nombre}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-dark_grey dark:text-gray-400">
                        {evento.ubicacion || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-dark_grey dark:text-gray-400">
                        {formatDate(evento.fecha_inicio)}
                      </td>
                      <td className="px-6 py-4 text-sm text-dark_grey dark:text-gray-400">
                        {formatDate(evento.fecha_fin)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditar(evento.id)}
                            className="p-2 text-primary hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Icon icon="solar:pen-linear" className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(evento)}
                            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Icon
                              icon="solar:trash-bin-2-linear"
                              className="w-5 h-5"
                            />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Icon
                  icon="solar:danger-circle-bold"
                  className="w-6 h-6 text-red-500"
                />
              </div>
              <h3 className="text-2xl font-bold text-midnight_text dark:text-white">
                Eliminar Evento
              </h3>
            </div>

            <p className="text-dark_grey dark:text-gray-400 mb-8">
              ¿Estás seguro de que deseas eliminar el evento &ldquo;
              <span className="font-semibold text-midnight_text dark:text-white">
                {eventoToDelete?.nombre}
              </span>
              &rdquo;? Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 px-6 py-3 rounded-full border-2 border-gray-300 dark:border-gray-600 text-midnight_text dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting}
                className="flex-1 px-6 py-3 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleting && (
                  <Icon
                    icon="eos-icons:loading"
                    className="w-5 h-5 animate-spin"
                  />
                )}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default EventosPage;
