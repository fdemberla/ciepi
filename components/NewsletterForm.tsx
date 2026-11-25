"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Icon } from "@iconify/react";
import toast from "react-hot-toast";
import { withBasePath } from "@/lib/basePath";

const RECAPTCHA_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim();

/** Token de reCAPTCHA v3 para la acción "newsletter" (el servidor lo exige si tiene la clave). */
async function obtenerTokenRecaptcha(): Promise<string | undefined> {
  if (!RECAPTCHA_SITE_KEY) return undefined;
  if (!window.grecaptcha?.execute) {
    throw new Error("No se pudo cargar la verificación de seguridad. Recarga la página e intenta de nuevo.");
  }
  return window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action: "newsletter" });
}

export default function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [aceptoPolitica, setAceptoPolitica] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  // Carga el script de reCAPTCHA v3 (el mismo que usa el formulario de contacto).
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY || window.grecaptcha) return;
    const scriptId = "recaptcha-v3-script";
    if (document.getElementById(scriptId)) return;
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Ingresa tu correo electrónico.");
      return;
    }
    if (!aceptoPolitica) {
      toast.error("Debes aceptar la Política de Privacidad para suscribirte.");
      return;
    }

    try {
      setLoading(true);
      const recaptchaToken = await obtenerTokenRecaptcha();
      const response = await fetch(withBasePath("/api/newsletter/suscribir"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          aceptoPolitica,
          recaptchaToken,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo completar la suscripción.");
      }

      setSubmittedMessage(data.message);
      toast.success(data.message);
      setEmail("");
      setAceptoPolitica(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al procesar la suscripción.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-6 mb-12 shadow-sm">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        <div className="lg:col-span-5">
          <div className="flex items-center gap-2 text-primary font-semibold text-sm mb-1">
            <Icon icon="solar:mailbox-linear" className="text-lg" />
            <span>Boletín Informativo</span>
          </div>
          <h3 className="text-xl font-bold text-midnight_text dark:text-white">
            Suscríbete al Newsletter de CIEPI
          </h3>
          <p className="text-sm text-dark_grey dark:text-gray-400 mt-1">
            Recibe avisos de nuevas capacitaciones, eventos y convocatorias.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <label htmlFor="newsletter-email" className="sr-only">
              Correo electrónico
            </label>
            <input
              id="newsletter-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.correo@ejemplo.com"
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-midnight_text dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <>
                  <Icon icon="solar:refresh-linear" className="animate-spin text-base" />
                  Enviando...
                </>
              ) : (
                <>
                  Suscribirme
                  <Icon icon="solar:plain-linear" className="text-base" />
                </>
              )}
            </button>
          </div>

          <label className="flex items-start gap-2.5 text-xs text-dark_grey dark:text-gray-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={aceptoPolitica}
              onChange={(e) => setAceptoPolitica(e.target.checked)}
              disabled={loading}
              className="mt-0.5 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <span>
              He leído y acepto la{" "}
              <Link
                href="/privacidad"
                className="text-primary hover:underline font-medium"
              >
                Política de Privacidad
              </Link>{" "}
              y autorizo el envío de boletines conforme a la Ley 81 de 2019 de
              Panamá.
            </span>
          </label>

          {submittedMessage && (
            <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
              {submittedMessage}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
