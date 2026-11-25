"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Table from "@/components/Table";
import type { ColumnDef } from "@tanstack/react-table";

interface TransicionConsulta {
  a: string;
  accion: string;
  etiqueta: string;
  requiereMotivo: boolean;
  override: boolean;
}

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
  /** Acciones permitidas para el rol actual (las calcula el servidor). */
  transiciones: TransicionConsulta[];
}

interface EntradaHistorial {
  id: number;
  estado_de: string | null;
  estado_a: string;
  accion: string;
  actor_tipo: string;
  actor_nombre: string | null;
  motivo: string | null;
  es_override: boolean;
  creado_en: string;
}

interface RespuestaPrevia {
  id: number;
  respuesta: string;
  admin_nombre: string | null;
  creado_en: string;
}

interface DetalleConsulta extends Consulta {
  historial: EntradaHistorial[];
  respuestas_previas: RespuestaPrevia[];
}

const ETIQUETA_ESTADO: Record<string, string> = {
  pendiente: "Pendiente",
  en_proceso: "En Proceso",
  respondida: "Respondida",
  cerrada: "Cerrada",
};

const ETIQUETA_ACCION: Record<string, string> = {
  crear: "Consulta recibida",
  tomar: "Tomada",
  responder: "Respondida",
  cerrar: "Cerrada",
  reabrir: "Reabierta",
};

const MAX_RESPUESTA = 5000;

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

export default function ConsultasAdminPage() {
  const router = useRouter();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);
  const [puedeEliminar, setPuedeEliminar] = useState(false);
  const [selectedConsulta, setSelectedConsulta] =
    useState<DetalleConsulta | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [respuesta, setRespuesta] = useState("");
  const [motivo, setMotivo] = useState("");
  const [errorAccion, setErrorAccion] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchConsultas();
  }, []);

  const fetchConsultas = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${basePath}/api/admin/consultas?limit=100`);

      if (!response.ok) {
        throw new Error("Error al cargar consultas");
      }

      const data = await response.json();
      setConsultas(data.data);
      setPuedeEliminar(Boolean(data.permisos?.eliminar));
    } catch (error) {
      console.error("Error fetching consultas:", error);
      toast.error("Error al cargar las consultas");
    } finally {
      setLoading(false);
    }
  };

  /** Carga el detalle (historial, respuestas anteriores y acciones permitidas). */
  const cargarDetalle = async (id: number) => {
    setCargandoDetalle(true);
    try {
      const response = await fetch(`${basePath}/api/admin/consultas/${id}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || "Error al cargar la consulta");
      }
      setSelectedConsulta(data.data);
    } catch (error) {
      console.error("Error cargando consulta:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al cargar la consulta",
      );
      setShowModal(false);
    } finally {
      setCargandoDetalle(false);
    }
  };

  const handleVerDetalles = (consulta: Consulta) => {
    setSelectedConsulta({ ...consulta, historial: [], respuestas_previas: [] });
    setRespuesta("");
    setMotivo("");
    setErrorAccion(null);
    setShowModal(true);
    cargarDetalle(consulta.id);
  };

  /** Ejecuta una acción de la máquina de estados (tomar, responder, cerrar, reabrir). */
  const ejecutarAccion = async (t: TransicionConsulta) => {
    if (!selectedConsulta) return;
    setErrorAccion(null);

    if (t.accion === "responder" && !respuesta.trim()) {
      setErrorAccion("Escribe la respuesta antes de enviarla.");
      return;
    }
    if (t.requiereMotivo && !motivo.trim()) {
      setErrorAccion("Escribe el motivo para realizar esta acción.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${basePath}/api/admin/consultas/${selectedConsulta.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accion: t.accion,
            estado_actual: selectedConsulta.estado,
            respuesta: t.accion === "responder" ? respuesta : undefined,
            motivo: motivo.trim() || undefined,
          }),
        },
      );
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const mensaje = data.error || "No se pudo actualizar la consulta";
        setErrorAccion(mensaje);
        toast.error(mensaje);
        // 409: otra persona la cambió; se recarga para mostrar el estado real.
        if (response.status === 409) {
          await Promise.all([
            cargarDetalle(selectedConsulta.id),
            fetchConsultas(),
          ]);
        }
        return;
      }

      toast.success(
        t.accion === "responder"
          ? "Respuesta guardada exitosamente"
          : `Consulta: ${ETIQUETA_ESTADO[t.a] ?? t.a}`,
      );
      setRespuesta("");
      setMotivo("");
      await Promise.all([cargarDetalle(selectedConsulta.id), fetchConsultas()]);
    } catch (error) {
      console.error("Error actualizando consulta:", error);
      setErrorAccion("Error de conexión al actualizar la consulta");
      toast.error("Error al actualizar la consulta");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEliminar = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta consulta?")) {
      return;
    }

    try {
      const response = await fetch(`${basePath}/api/admin/consultas/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Error al eliminar consulta");
      }

      toast.success("Consulta eliminada exitosamente");
      fetchConsultas();
    } catch (error) {
      console.error("Error eliminando consulta:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al eliminar la consulta",
      );
    }
  };

  const getEstadoBadge = (estado: string) => {
    const badges = {
      pendiente:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      en_proceso:
        "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
      respondida:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      cerrada: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-semibold ${
          badges[estado as keyof typeof badges]
        }`}
      >
        {ETIQUETA_ESTADO[estado] ?? estado}
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
          {puedeEliminar && (
            <button
              onClick={() => handleEliminar(row.original.id)}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Eliminar consulta"
            >
              <Icon icon="solar:trash-bin-trash-linear" className="w-5 h-5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const transiciones = selectedConsulta?.transiciones ?? [];
  const puedeResponder = transiciones.some((t) => t.accion === "responder");
  const pideMotivo = transiciones.some((t) => t.requiereMotivo);

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center pb-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h1 className="text-3xl font-bold text-midnight_text dark:text-white mb-1">
              Gestión de Consultas
            </h1>
            <p className="text-dark_grey dark:text-gray-400">
              Administra y responde las consultas de contacto
            </p>
          </div>
          <button
            onClick={() => router.push("/admin/tipos-consultas")}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors shadow-md hover:shadow-lg"
          >
            <Icon icon="solar:settings-linear" className="w-4 h-4" />
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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 animate-fade-in">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="consulta-modal-titulo"
            className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 dark:border-gray-700 animate-fade-up"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 id="consulta-modal-titulo" className="text-2xl font-bold text-midnight_text dark:text-white">
                    Detalles de la Consulta
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    ID: {selectedConsulta.id}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  aria-label="Cerrar detalles de la consulta"
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <Icon
                    icon="solar:close-circle-linear"
                    className="w-6 h-6"
                    aria-hidden="true"
                  />
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

              {/* Estado actual */}
              <div className="mb-6 flex items-center gap-3">
                <span className="text-sm font-semibold text-midnight_text dark:text-white">
                  Estado:
                </span>
                {getEstadoBadge(selectedConsulta.estado)}
                {cargandoDetalle && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Actualizando...
                  </span>
                )}
              </div>

              {/* Respuestas enviadas (todas; si aún no hay tabla de respuestas, la última) */}
              {selectedConsulta.respuestas_previas.length > 0 ? (
                <div className="mb-6">
                  <h3 className="font-semibold text-midnight_text dark:text-white mb-2">
                    Respuestas enviadas
                  </h3>
                  <div className="space-y-3">
                    {selectedConsulta.respuestas_previas.map((r) => (
                      <div
                        key={r.id}
                        className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4"
                      >
                        <p className="text-sm text-midnight_text dark:text-white whitespace-pre-wrap">
                          {r.respuesta}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {r.admin_nombre || "Admin"} ·{" "}
                          {new Date(r.creado_en).toLocaleString("es-PA")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                selectedConsulta.respuesta && (
                  <div className="mb-6">
                    <h3 className="font-semibold text-midnight_text dark:text-white mb-2">
                      Respuesta
                    </h3>
                    <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                      <p className="text-sm text-midnight_text dark:text-white whitespace-pre-wrap">
                        {selectedConsulta.respuesta}
                      </p>
                      {selectedConsulta.fecha_respuesta && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                          {selectedConsulta.respondido_por_nombre || "Admin"} ·{" "}
                          {new Date(
                            selectedConsulta.fecha_respuesta,
                          ).toLocaleString("es-PA")}
                        </p>
                      )}
                    </div>
                  </div>
                )
              )}

              {/* Nueva respuesta: solo si la acción "responder" está permitida */}
              {puedeResponder && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="respuesta-consulta"
                      className="block text-sm font-semibold text-midnight_text dark:text-white"
                    >
                      Respuesta
                    </label>
                    <span className="text-xs text-dark_grey dark:text-gray-400">
                      {respuesta.length} / {MAX_RESPUESTA} caracteres
                    </span>
                  </div>
                  <textarea
                    id="respuesta-consulta"
                    value={respuesta}
                    onChange={(e) => setRespuesta(e.target.value)}
                    rows={6}
                    maxLength={MAX_RESPUESTA}
                    placeholder="Escribe tu respuesta aquí..."
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-midnight_text dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none transition-colors"
                  />
                </div>
              )}

              {/* Motivo: obligatorio para reabrir una consulta cerrada */}
              {pideMotivo && (
                <div className="mb-6">
                  <label
                    htmlFor="motivo-consulta"
                    className="block text-sm font-semibold text-midnight_text dark:text-white mb-2"
                  >
                    Motivo para reabrir
                  </label>
                  <input
                    id="motivo-consulta"
                    type="text"
                    value={motivo}
                    onChange={(e) => setMotivo(e.target.value)}
                    maxLength={500}
                    placeholder="Explica por qué se reabre la consulta"
                    className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-midnight_text dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                  />
                </div>
              )}

              {errorAccion && (
                <div
                  role="alert"
                  className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-300"
                >
                  {errorAccion}
                </div>
              )}

              {/* Acciones permitidas (las decide el servidor según estado y rol) */}
              <div className="flex flex-wrap gap-3">
                {transiciones.map((t) => (
                  <button
                    key={t.accion}
                    type="button"
                    onClick={() => ejecutarAccion(t)}
                    disabled={isSubmitting || cargandoDetalle}
                    className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${
                      t.accion === "responder"
                        ? "bg-primary hover:bg-primary/90 text-white shadow-md hover:shadow-lg"
                        : t.accion === "cerrar"
                          ? "bg-gray-600 hover:bg-gray-700 text-white"
                          : t.override
                            ? "bg-amber-600 hover:bg-amber-700 text-white"
                            : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {isSubmitting ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    ) : (
                      t.accion === "responder" && (
                        <Icon icon="solar:plain-2-linear" className="w-5 h-5" />
                      )
                    )}
                    {t.etiqueta}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl font-semibold text-midnight_text dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancelar
                </button>
              </div>
              {transiciones.length === 0 && !cargandoDetalle && (
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  No hay acciones disponibles para esta consulta con tu rol.
                </p>
              )}

              {/* Historial de estados */}
              {selectedConsulta.historial.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-midnight_text dark:text-white mb-3">
                    Historial
                  </h3>
                  <ul className="space-y-2">
                    {selectedConsulta.historial.map((h) => (
                      <li
                        key={h.id}
                        className="text-sm text-midnight_text dark:text-gray-200"
                      >
                        <span className="font-medium">
                          {ETIQUETA_ACCION[h.accion] ?? h.accion}
                        </span>
                        {h.estado_de && (
                          <span className="text-gray-500 dark:text-gray-400">
                            {" "}
                            ({ETIQUETA_ESTADO[h.estado_de] ?? h.estado_de} →{" "}
                            {ETIQUETA_ESTADO[h.estado_a] ?? h.estado_a})
                          </span>
                        )}
                        {h.es_override && (
                          <span className="ml-1 text-xs font-semibold text-amber-600">
                            [excepción]
                          </span>
                        )}
                        <span className="block text-xs text-gray-500 dark:text-gray-400">
                          {h.actor_tipo === "ciudadano"
                            ? "Ciudadano"
                            : h.actor_nombre || "Admin"}{" "}
                          · {new Date(h.creado_en).toLocaleString("es-PA")}
                          {h.motivo ? ` · Motivo: ${h.motivo}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
