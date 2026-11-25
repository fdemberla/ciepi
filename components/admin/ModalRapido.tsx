"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@iconify/react";

interface ModalRapidoProps {
  titulo: string;
  descripcion?: string;
  children: ReactNode;
  textoGuardar?: string;
  /** Devuelve un mensaje de error para mostrarlo, o null si se guardó. */
  onGuardar: () => Promise<string | null>;
  onCerrar: () => void;
}

/**
 * Ventana pequeña para crear un registro (sede, aula, profesor...) sin salir del
 * formulario actual. Se monta fuera del formulario (portal) y no usa <form>:
 * así "Guardar" nunca envía el formulario de la página por accidente.
 */
export default function ModalRapido({
  titulo,
  descripcion,
  children,
  textoGuardar = "Guardar",
  onGuardar,
  onCerrar,
}: ModalRapidoProps) {
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLDivElement>(null);

  // El padre crea onCerrar en cada render (con cada letra): se guarda en una ref
  // para que los efectos no se repitan y el foco no salte al primer campo.
  const cerrarRef = useRef(onCerrar);
  const guardandoRef = useRef(guardando);
  cerrarRef.current = onCerrar;
  guardandoRef.current = guardando;

  // Foco en el primer campo solo al abrir.
  useEffect(() => {
    panel.current?.querySelector<HTMLElement>("input, select, textarea")?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !guardandoRef.current && cerrarRef.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const guardar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const err = await onGuardar();
      if (err) setError(err);
    } catch {
      setError("No se pudo guardar. Intenta de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50" onClick={() => !guardando && onCerrar()}>
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-rapido-titulo"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          // Enter guarda (salvo en textarea), sin enviar el formulario de la página.
          if (e.key === "Enter" && (e.target as HTMLElement).tagName !== "TEXTAREA") {
            e.preventDefault();
            if (!guardando) guardar();
          }
        }}
        className="w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100 dark:border-gray-700">
          <div>
            <h2 id="modal-rapido-titulo" className="text-xl font-bold text-primary dark:text-white">
              {titulo}
            </h2>
            {descripcion && <p className="text-sm text-dark_grey dark:text-gray-400 mt-0.5">{descripcion}</p>}
          </div>
          <button type="button" onClick={onCerrar} disabled={guardando} aria-label="Cerrar" className="text-dark_grey hover:text-midnight_text dark:hover:text-white">
            <Icon icon="solar:close-circle-linear" className="text-2xl" />
          </button>
        </div>
        <div className="p-5 flex flex-col gap-4">
          {children}
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-3 py-2 text-sm">
              {error}
            </p>
          )}
        </div>
        <div className="flex justify-end gap-2 p-5 pt-0">
          <button type="button" onClick={onCerrar} disabled={guardando} className="px-4 py-2 rounded-full text-sm font-semibold text-dark_grey">
            Cancelar
          </button>
          <button
            type="button"
            onClick={guardar}
            disabled={guardando}
            className="inline-flex items-center gap-1.5 px-5 py-2 rounded-full text-sm font-semibold bg-primary text-white disabled:opacity-60"
          >
            <Icon icon="solar:check-circle-linear" aria-hidden="true" />
            {guardando ? "Guardando..." : textoGuardar}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export const CAMPO_MODAL =
  "w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-midnight_text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary";

export function CampoModal({ etiqueta, children, ayuda }: { etiqueta: string; children: ReactNode; ayuda?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-semibold text-midnight_text dark:text-white">{etiqueta}</span>
      {children}
      {ayuda && <span className="text-xs text-dark_grey dark:text-gray-400">{ayuda}</span>}
    </label>
  );
}
