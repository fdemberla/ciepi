"use client";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import type { TransicionDisponible } from "@/lib/estados/comun";
import { ETIQUETA_ESTADO_BLOG, type EstadoBlog } from "@/lib/estados/blog";

/**
 * Botones de cambio de estado de un blog. Solo dibuja las transiciones que devolvió la
 * API para el usuario actual (lib/estados/blog.ts); pide motivo cuando es obligatorio,
 * envía estado_actual para detectar conflictos y muestra el error del servidor.
 */

export type TransicionBlog = TransicionDisponible<number>;

const ESTILO_ACCION: Record<string, { clase: string; icono: string }> = {
  enviar: { clase: "bg-primary text-white hover:bg-primary/90", icono: "solar:plain-linear" },
  aprobar_ciepi: { clase: "bg-green-600 text-white hover:bg-green-700", icono: "solar:check-circle-linear" },
  publicar: { clase: "bg-green-600 text-white hover:bg-green-700", icono: "solar:verified-check-linear" },
  rechazar_ciepi: { clase: "bg-red-600 text-white hover:bg-red-700", icono: "solar:close-circle-linear" },
  rechazar_rp: { clase: "bg-red-600 text-white hover:bg-red-700", icono: "solar:close-circle-linear" },
  retirar: {
    clase: "bg-gray-200 text-midnight_text hover:bg-gray-300 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600",
    icono: "solar:undo-left-linear",
  },
  despublicar: { clase: "bg-amber-600 text-white hover:bg-amber-700", icono: "solar:eye-closed-linear" },
};

const ESTILO_POR_DEFECTO = {
  clase: "bg-secondary text-white hover:bg-secondary/90",
  icono: "solar:refresh-linear",
};

interface BlogAccionesEstadoProps {
  blogId: number | string;
  titulo?: string;
  estadoActual: number;
  transiciones: TransicionBlog[] | undefined;
  /** Se llama tras un cambio correcto o un conflicto (409) para recargar los datos. */
  onCambio: (resultado: { estado: number; estado_nombre?: string } | null) => void;
  compacto?: boolean;
}

export default function BlogAccionesEstado({
  blogId,
  titulo,
  estadoActual,
  transiciones,
  onCambio,
  compacto = false,
}: BlogAccionesEstadoProps) {
  const [seleccionada, setSeleccionada] = useState<TransicionBlog | null>(null);
  const [motivo, setMotivo] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!transiciones || transiciones.length === 0) {
    return compacto ? null : (
      <p className="text-sm text-dark_grey dark:text-gray-400">
        No tienes acciones disponibles para este blog en su estado actual.
      </p>
    );
  }

  const abrir = (t: TransicionBlog) => {
    setSeleccionada(t);
    setMotivo("");
  };

  const confirmar = async () => {
    if (!seleccionada) return;
    if (seleccionada.requiereMotivo && !motivo.trim()) {
      toast.error("Debes escribir el motivo para este cambio.");
      return;
    }
    try {
      setEnviando(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const res = await fetch(`${basePath}/api/admin/blog/${blogId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: seleccionada.a,
          estado_actual: estadoActual,
          motivo: motivo.trim() || undefined,
        }),
      });
      const result = await res.json().catch(() => ({}));
      if (!res.ok || !result.success) {
        toast.error(result.error || "No se pudo cambiar el estado del blog.");
        if (res.status === 409) {
          setSeleccionada(null);
          onCambio(null);
        }
        return;
      }
      toast.success(
        `Estado actualizado: ${
          result.data?.estado_nombre ?? ETIQUETA_ESTADO_BLOG[seleccionada.a as EstadoBlog]
        }`
      );
      setSeleccionada(null);
      onCambio({ estado: seleccionada.a, estado_nombre: result.data?.estado_nombre });
    } catch (error) {
      console.error("Error cambiando estado del blog:", error);
      toast.error("No se pudo cambiar el estado del blog.");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      <div className={`flex flex-wrap ${compacto ? "gap-1" : "gap-3"}`}>
        {transiciones.map((t) => {
          const estilo = ESTILO_ACCION[t.accion] ?? ESTILO_POR_DEFECTO;
          return (
            <button
              key={`${t.accion}-${t.a}`}
              type="button"
              onClick={() => abrir(t)}
              title={t.etiqueta}
              aria-label={t.etiqueta}
              className={`flex items-center justify-center gap-2 rounded-lg font-medium transition-colors ${
                compacto ? "px-2 py-1 text-xs" : "px-4 py-2 text-sm"
              } ${estilo.clase}`}
            >
              <Icon icon={estilo.icono} className={compacto ? "w-4 h-4" : "w-5 h-5"} aria-hidden="true" />
              <span>{t.etiqueta}</span>
            </button>
          );
        })}
      </div>

      {seleccionada && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="blog-accion-titulo"
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-md w-full mx-auto"
          >
            <h3
              id="blog-accion-titulo"
              className="text-lg font-semibold text-midnight_text dark:text-white mb-2"
            >
              {seleccionada.etiqueta}
            </h3>
            <p className="text-sm text-dark_grey dark:text-gray-400 mb-4">
              {titulo ? <>&ldquo;{titulo}&rdquo; pasará </> : "El blog pasará "}
              de <strong>{ETIQUETA_ESTADO_BLOG[estadoActual as EstadoBlog] ?? estadoActual}</strong> a{" "}
              <strong>{ETIQUETA_ESTADO_BLOG[seleccionada.a as EstadoBlog] ?? seleccionada.a}</strong>.
            </p>

            <label
              htmlFor="blog-accion-motivo"
              className="block text-sm font-medium text-midnight_text dark:text-white mb-2"
            >
              {seleccionada.requiereMotivo ? (
                <>
                  Motivo <span className="text-red-500">*</span>
                </>
              ) : (
                "Comentario (opcional)"
              )}
            </label>
            <textarea
              id="blog-accion-motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder={
                seleccionada.requiereMotivo
                  ? "Explica el motivo; el autor lo verá en el historial."
                  : "Agregar comentario sobre este cambio..."
              }
              maxLength={2000}
              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-midnight_text dark:text-white resize-none mb-4"
              rows={3}
            />

            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setSeleccionada(null)}
                disabled={enviando}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-midnight_text dark:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={enviando || (seleccionada.requiereMotivo && !motivo.trim())}
                className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {enviando ? "Procesando..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export interface EntradaHistorialBlog {
  id: number | string;
  estado_de: string | null;
  estado_a: string;
  accion: string;
  actor_nombre: string | null;
  motivo: string | null;
  es_override: boolean;
  creado_en: string;
}

/** Historial de cambios de estado (ciepi.estado_historial), del más reciente al más antiguo. */
export function BlogHistorial({ historial }: { historial: EntradaHistorialBlog[] | undefined }) {
  if (!historial || historial.length === 0) {
    return (
      <p className="text-sm text-dark_grey dark:text-gray-400">
        Sin cambios de estado registrados.
      </p>
    );
  }
  const nombre = (e: string | null) =>
    e === null ? "—" : ETIQUETA_ESTADO_BLOG[Number(e) as EstadoBlog] ?? e;
  return (
    <ol className="space-y-3">
      {historial.map((h) => (
        <li
          key={h.id}
          className="border-l-4 border-primary/40 pl-3 text-sm text-midnight_text dark:text-white"
        >
          <div className="font-medium">
            {h.estado_de === null ? "Creado en" : `${nombre(h.estado_de)} →`} {nombre(h.estado_a)}
            {h.es_override && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                excepción
              </span>
            )}
          </div>
          <div className="text-xs text-dark_grey dark:text-gray-400">
            {h.actor_nombre || "Sistema"} ·{" "}
            {new Date(h.creado_en).toLocaleString("es-PA", { timeZone: "America/Panama" })}
          </div>
          {h.motivo && (
            <p className="mt-1 text-sm text-dark_grey dark:text-gray-300 whitespace-pre-wrap">
              {h.motivo}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}
