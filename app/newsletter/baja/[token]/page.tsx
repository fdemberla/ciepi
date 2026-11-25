"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { withBasePath } from "@/lib/basePath";

type State = "loading" | "ready" | "done" | "error";

export default function BajaNewsletterPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [state, setState] = useState<State>("loading");
  const [emailMasked, setEmailMasked] = useState<string>("");
  const [message, setMessage] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    const validar = async () => {
      try {
        const res = await fetch(
          withBasePath(`/api/newsletter/baja/${encodeURIComponent(token)}`),
        );
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setState("error");
          setMessage(data.error || "El enlace de baja no es válido.");
          return;
        }
        setEmailMasked(data.emailMasked || "");
        if (data.estado === "baja") {
          setState("done");
          setMessage("Tu correo ya había sido dado de baja anteriormente.");
        } else {
          setState("ready");
        }
      } catch {
        setState("error");
        setMessage("Error de conexión al validar el enlace.");
      }
    };
    validar();
  }, [token]);

  const handleUnsubscribe = async () => {
    if (!token) return;
    try {
      setSubmitting(true);
      const res = await fetch(
        withBasePath(`/api/newsletter/baja/${encodeURIComponent(token)}`),
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setState("error");
        setMessage(data.error || "No se pudo procesar la baja.");
        return;
      }
      setState("done");
      setMessage(data.message);
    } catch {
      setState("error");
      setMessage("Error de conexión al procesar la baja.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-slateGray dark:bg-gray-900 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
          <Icon icon="solar:mailbox-linear" className="text-3xl text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-midnight_text dark:text-white mb-3">
          {state === "done"
            ? "Suscripción cancelada"
            : state === "error"
              ? "Enlace no válido"
              : "Cancelar suscripción"}
        </h1>

        {state === "loading" && (
          <p className="text-sm text-dark_grey dark:text-gray-300">
            Validando solicitud...
          </p>
        )}

        {state === "ready" && (
          <>
            <p className="text-sm text-dark_grey dark:text-gray-300 mb-6 leading-relaxed">
              ¿Deseas dejar de recibir el boletín informativo de CIEPI para{" "}
              <strong>{emailMasked}</strong>?
            </p>
            <button
              onClick={handleUnsubscribe}
              disabled={submitting}
              className="w-full px-6 py-3 rounded-full bg-red-600 text-white text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-60"
            >
              {submitting ? "Procesando..." : "Confirmar baja del boletín"}
            </button>
          </>
        )}

        {(state === "done" || state === "error") && (
          <>
            <p className="text-sm text-dark_grey dark:text-gray-300 mb-7 leading-relaxed">
              {message}
            </p>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Volver al inicio
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
