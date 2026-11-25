"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import type { Descendant } from "slate";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import AdminProtection from "@/components/AdminProtection";
import SlateEditorField from "@/components/SlateEditorField";
import { withBasePath } from "@/lib/basePath";
import { slateNodesToHtml } from "@/lib/newsletter";

interface Stats {
  activos: number;
  pendientes: number;
  bajas: number;
  total: number;
}

interface Suscriptor {
  id: number;
  email: string;
  nombre: string | null;
  estado: "pendiente" | "activo" | "baja";
  version_politica: string;
  fecha_consentimiento: string | null;
  fecha_confirmacion: string | null;
  fecha_baja: string | null;
  creado_en: string;
}

interface Envio {
  id: number;
  asunto: string;
  total_destinatarios: number;
  total_enviados: number;
  total_fallidos: number;
  enviado_por: string;
  fecha_envio: string;
}

const INITIAL_SLATE_VALUE: Descendant[] = [
  {
    type: "paragraph",
    children: [{ text: "" }],
  } as unknown as Descendant,
];

export default function AdminNewsletterPage() {
  const [tab, setTab] = useState<"enviar" | "suscriptores" | "historial">("enviar");
  const [stats, setStats] = useState<Stats>({
    activos: 0,
    pendientes: 0,
    bajas: 0,
    total: 0,
  });
  const [suscriptores, setSuscriptores] = useState<Suscriptor[]>([]);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const [asunto, setAsunto] = useState("");
  const [contenido, setContenido] = useState<Descendant[]>(INITIAL_SLATE_VALUE);
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const queryStr = estadoFiltro
        ? `?estado=${encodeURIComponent(estadoFiltro)}`
        : "";
      const res = await fetch(withBasePath(`/api/admin/newsletter${queryStr}`));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cargar datos");
      setStats(data.stats);
      setSuscriptores(data.suscriptores || []);
      setEnvios(data.envios || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error cargando newsletter",
      );
    } finally {
      setLoading(false);
    }
  }, [estadoFiltro]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!asunto.trim()) {
      toast.error("Ingresa el asunto del boletín.");
      return;
    }

    const html = slateNodesToHtml(contenido);
    const plainText = html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, "").trim();
    if (!plainText) {
      toast.error("El contenido del boletín no puede estar vacío.");
      return;
    }

    if (stats.activos === 0) {
      toast.error("No hay suscriptores activos para recibir el boletín.");
      return;
    }

    try {
      setSending(true);
      const res = await fetch(withBasePath("/api/admin/newsletter/enviar"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asunto: asunto.trim(),
          contenidoHtml: html,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al enviar el boletín");

      toast.success(data.message);
      setAsunto("");
      setContenido(INITIAL_SLATE_VALUE);
      fetchData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al enviar boletín",
      );
    } finally {
      setSending(false);
    }
  };

  const exportCsv = () => {
    const header = [
      "ID",
      "Email",
      "Nombre",
      "Estado",
      "Version Politica",
      "Fecha Consentimiento",
      "Fecha Confirmacion",
      "Fecha Baja",
    ];
    const rows = suscriptores.map((s) => [
      s.id,
      s.email,
      s.nombre ?? "",
      s.estado,
      s.version_politica,
      s.fecha_consentimiento ?? "",
      s.fecha_confirmacion ?? "",
      s.fecha_baja ?? "",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "newsletter_suscriptores.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminProtection>
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-10">
        <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold text-midnight_text dark:text-white">
                Gestión de Newsletter
              </h1>
              <p className="text-sm text-dark_grey dark:text-gray-400 mt-1">
                Administra suscriptores, consentimientos (Ley 81/2019) y envíos
                de boletines.
              </p>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: "Activos", value: stats.activos, color: "text-emerald-600" },
              { label: "Pendientes", value: stats.pendientes, color: "text-amber-600" },
              { label: "Bajas", value: stats.bajas, color: "text-red-600" },
              { label: "Total", value: stats.total, color: "text-primary" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-gray-700"
              >
                <p className="text-xs uppercase tracking-wider text-dark_grey dark:text-gray-400 font-semibold">
                  {item.label}
                </p>
                <p className={`text-3xl font-bold mt-1 ${item.color}`}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {[
              { id: "enviar", label: "Redactar Boletín", icon: "solar:pen-new-square-linear" },
              { id: "suscriptores", label: "Suscriptores", icon: "solar:users-group-rounded-linear" },
              { id: "historial", label: "Historial de Envíos", icon: "solar:history-linear" },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as typeof tab)}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-colors ${
                  tab === t.id
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white dark:bg-gray-800 text-dark_grey dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                }`}
              >
                <Icon icon={t.icon} className="text-lg" />
                {t.label}
              </button>
            ))}
          </div>

          {tab === "enviar" && (
            <form
              onSubmit={handleSend}
              className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-5"
            >
              <div>
                <label
                  htmlFor="newsletter-asunto"
                  className="block text-sm font-semibold text-midnight_text dark:text-white mb-2"
                >
                  Asunto del boletín
                </label>
                <input
                  id="newsletter-asunto"
                  type="text"
                  maxLength={255}
                  value={asunto}
                  onChange={(e) => setAsunto(e.target.value)}
                  placeholder="Ej: Nuevas capacitaciones abiertas — Noviembre"
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-midnight_text dark:text-white mb-2">
                  Contenido del boletín
                </label>
                <SlateEditorField
                  id="newsletter-contenido"
                  name="contenido"
                  value={contenido}
                  onChange={setContenido}
                />
                <p className="text-xs text-dark_grey dark:text-gray-400 mt-2">
                  El correo incluirá automáticamente el enlace de baja en 1 clic
                  y el enlace a la Política de Privacidad.
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={sending}
                  className="px-6 py-3 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center gap-2"
                >
                  <Icon icon="solar:plain-linear" className="text-lg" />
                  {sending
                    ? "Enviando boletín..."
                    : `Enviar a ${stats.activos} suscriptor(es) activo(s)`}
                </button>
              </div>
            </form>
          )}

          {tab === "suscriptores" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <select
                  value={estadoFiltro}
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm"
                >
                  <option value="">Todos los estados</option>
                  <option value="activo">Activos</option>
                  <option value="pendiente">Pendientes</option>
                  <option value="baja">Dados de baja</option>
                </select>
                <button
                  onClick={exportCsv}
                  className="px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                >
                  <Icon icon="solar:download-linear" className="text-base" />
                  Exportar CSV
                </button>
              </div>

              {loading ? (
                <p className="text-sm text-dark_grey dark:text-gray-400 py-6">
                  Cargando suscriptores...
                </p>
              ) : suscriptores.length === 0 ? (
                <p className="text-sm text-dark_grey dark:text-gray-400 py-6">
                  No hay suscriptores registrados.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase text-dark_grey dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="py-3 pr-4">Correo</th>
                        <th className="py-3 pr-4">Estado</th>
                        <th className="py-3 pr-4">Política</th>
                        <th className="py-3 pr-4">Consentimiento</th>
                        <th className="py-3">Confirmación</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {suscriptores.map((s) => (
                        <tr key={s.id}>
                          <td className="py-3 pr-4 font-medium text-midnight_text dark:text-white">
                            {s.email}
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                                s.estado === "activo"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                                  : s.estado === "pendiente"
                                    ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                              }`}
                            >
                              {s.estado}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-dark_grey dark:text-gray-400">
                            v{s.version_politica}
                          </td>
                          <td className="py-3 pr-4 text-dark_grey dark:text-gray-400">
                            {s.fecha_consentimiento
                              ? new Date(s.fecha_consentimiento).toLocaleString("es-PA")
                              : "—"}
                          </td>
                          <td className="py-3 text-dark_grey dark:text-gray-400">
                            {s.fecha_confirmacion
                              ? new Date(s.fecha_confirmacion).toLocaleString("es-PA")
                              : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === "historial" && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              {envios.length === 0 ? (
                <p className="text-sm text-dark_grey dark:text-gray-400 py-6">
                  Aún no se han enviado boletines.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs uppercase text-dark_grey dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="py-3 pr-4">Fecha</th>
                        <th className="py-3 pr-4">Asunto</th>
                        <th className="py-3 pr-4">Enviados</th>
                        <th className="py-3 pr-4">Fallidos</th>
                        <th className="py-3">Enviado por</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {envios.map((e) => (
                        <tr key={e.id}>
                          <td className="py-3 pr-4 text-dark_grey dark:text-gray-400">
                            {new Date(e.fecha_envio).toLocaleString("es-PA")}
                          </td>
                          <td className="py-3 pr-4 font-medium text-midnight_text dark:text-white">
                            {e.asunto}
                          </td>
                          <td className="py-3 pr-4 text-emerald-600 font-semibold">
                            {e.total_enviados}/{e.total_destinatarios}
                          </td>
                          <td className="py-3 pr-4 text-red-600">
                            {e.total_fallidos}
                          </td>
                          <td className="py-3 text-dark_grey dark:text-gray-400">
                            {e.enviado_por}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminProtection>
  );
}
