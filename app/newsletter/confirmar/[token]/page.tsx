"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { withBasePath } from "@/lib/basePath";

/*
 * Al abrir el enlace solo se valida (GET, sin cambios). La confirmación se hace al
 * pulsar el botón (POST), para que los escáneres de enlaces de los clientes de correo
 * no confirmen la suscripción en nombre de la persona.
 */

type Status = "loading" | "ready" | "success" | "error";

export default function ConfirmarNewsletterPage() {
  const params = useParams<{ token: string }>();
  const token = params?.token;
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("Validando tu enlace...");
  const [emailMasked, setEmailMasked] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;
    const validar = async () => {
      try {
        const res = await fetch(
          withBasePath(`/api/newsletter/confirmar/${encodeURIComponent(token)}`),
        );
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setStatus("error");
          setMessage(data.error || "El enlace de confirmación no es válido.");
          return;
        }
        setEmailMasked(data.emailMasked || "");
        if (data.yaConfirmada) {
          setStatus("success");
          setMessage("Tu suscripción ya había sido confirmada.");
        } else {
          setStatus("ready");
        }
      } catch {
        setStatus("error");
        setMessage("Error de conexión al validar el enlace.");
      }
    };
    validar();
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    try {
      setSubmitting(true);
      const res = await fetch(
        withBasePath(`/api/newsletter/confirmar/${encodeURIComponent(token)}`),
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("success");
        setMessage(data.message);
      } else {
        setStatus("error");
        setMessage(data.error || "No se pudo confirmar tu suscripción.");
      }
    } catch {
      setStatus("error");
      setMessage("Error de conexión al confirmar tu suscripción.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] bg-slateGray dark:bg-gray-900 flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
        {status === "loading" && (
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon
              icon="solar:refresh-linear"
              className="text-3xl text-primary animate-spin"
            />
          </div>
        )}
        {status === "ready" && (
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon icon="solar:mailbox-linear" className="text-3xl text-primary" />
          </div>
        )}
        {status === "success" && (
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
            <Icon
              icon="solar:check-circle-linear"
              className="text-4xl text-emerald-600 dark:text-emerald-400"
            />
          </div>
        )}
        {status === "error" && (
          <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center">
            <Icon
              icon="solar:danger-circle-linear"
              className="text-4xl text-red-600 dark:text-red-400"
            />
          </div>
        )}

        <h1 className="text-2xl font-bold text-midnight_text dark:text-white mb-3">
          {status === "loading"
            ? "Validando enlace"
            : status === "ready"
              ? "Confirma tu suscripción"
              : status === "success"
                ? "¡Suscripción confirmada!"
                : "No se pudo confirmar"}
        </h1>

        {status === "ready" ? (
          <>
            <p className="text-sm text-dark_grey dark:text-gray-300 mb-6 leading-relaxed">
              Pulsa el botón para confirmar que deseas recibir el boletín informativo de
              CIEPI en <strong>{emailMasked}</strong>.
            </p>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={submitting}
              className="w-full px-6 py-3 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
            >
              {submitting ? "Confirmando..." : "Confirmar suscripción"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-dark_grey dark:text-gray-300 mb-7 leading-relaxed">
              {message}
            </p>
            {status !== "loading" && (
              <Link
                href="/"
                className="inline-flex items-center justify-center px-6 py-3 rounded-full bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Volver al inicio
              </Link>
            )}
          </>
        )}
      </div>
    </div>
  );
}
