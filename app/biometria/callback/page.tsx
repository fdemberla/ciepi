"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Icon } from "@iconify/react";
import {
  BIOMETRIA_STORAGE_KEYS,
  saveBiometriaResult,
  getBiometriaRedirectUri,
  BiometriaResult,
} from "@/lib/biometria";

function BiometriaCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [status, setStatus] = useState<
    "validating" | "success" | "error" | "rejected"
  >("validating");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [resultData, setResultData] = useState<BiometriaResult | null>(null);
  const [countdown, setCountdown] = useState<number>(3);
  const [capacitacionId, setCapacitacionId] = useState<string>("");

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    const savedCapacitacionId =
      sessionStorage.getItem(BIOMETRIA_STORAGE_KEYS.CAPACITACION_ID) || "";
    setCapacitacionId(savedCapacitacionId);

    if (error) {
      setStatus("error");
      setErrorMessage(
        errorDescription || "El servicio biométrico canceló la verificación."
      );
      return;
    }

    if (!code || !state) {
      setStatus("error");
      setErrorMessage(
        "Respuesta inválida del servicio biométrico: Faltan parámetros de autorización."
      );
      return;
    }

    const savedState = sessionStorage.getItem(BIOMETRIA_STORAGE_KEYS.STATE);
    const verifier = sessionStorage.getItem(BIOMETRIA_STORAGE_KEYS.VERIFIER);

    if (!savedState || state !== savedState) {
      setStatus("error");
      setErrorMessage(
        "Fallo de seguridad CSRF: El estado de la sesión no coincide con la solicitud original."
      );
      return;
    }

    if (!verifier) {
      setStatus("error");
      setErrorMessage(
        "No se encontró el verificador criptográfico PKCE en la sesión del navegador."
      );
      return;
    }

    // Ejecutar canje seguro de código por token en el backend
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const redirectUri = getBiometriaRedirectUri();

    fetch(`${basePath}/api/biometria/token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        code_verifier: verifier,
        redirect_uri: redirectUri,
      }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          throw new Error(
            data.error || "Error al canjear la credencial de autenticación"
          );
        }
        return data;
      })
      .then((data) => {
        if (data.valido === true) {
          const result: BiometriaResult = {
            valido: true,
            estado: data.estado || "APROBADO",
            cedula: data.cedula,
            id_auditoria: data.id_auditoria,
            score_similitud: data.score_similitud,
            liveness_score: data.liveness_score,
            access_token: data.access_token,
            metodo_autenticacion: data.metodo_autenticacion,
            timestamp: new Date().toISOString(),
          };

          saveBiometriaResult(result);
          setResultData(result);
          setStatus("success");
        } else if (data.estado === "REVISION_MANUAL_SOLICITADA") {
          setStatus("rejected");
          setErrorMessage(
            "Ha optado por revisión presencial. Puede completar su registro y presentar su cédula físicamente en la sede de su capacitación."
          );
        } else {
          setStatus("rejected");
          setErrorMessage(
            `Validación no aprobada (${data.estado || "Rechazada"}). La prueba biométrica facial no coincidió con la base de datos oficial.`
          );
        }
      })
      .catch((err) => {
        console.error("Error en validación biométrica:", err);
        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "Error de comunicación con el servicio biométrico"
        );
      });
  }, [searchParams]);

  // Redirección con cuenta regresiva al completar éxito
  useEffect(() => {
    if (status !== "success") return;

    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      redirectToEnrollment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, countdown]);

  const redirectToEnrollment = (modoManual: boolean = false) => {
    if (capacitacionId) {
      const querySuffix = modoManual ? "?modo=manual" : "";
      router.push(`/capacitaciones/inscribirse/${capacitacionId}${querySuffix}`);
    } else {
      router.push("/capacitaciones");
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-emerald-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950 flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-lg">
        {/* Validating State */}
        {status === "validating" && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 sm:p-10 shadow-2xl border border-gray-100 dark:border-gray-700 text-center">
            <div className="relative mx-auto w-24 h-24 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping"></div>
              <div className="w-20 h-20 rounded-full border-4 border-emerald-600 border-t-transparent animate-spin"></div>
              <Icon
                icon="solar:shield-check-bold"
                className="absolute text-emerald-600 dark:text-emerald-400 text-3xl"
              />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Validando Identidad Oficial
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 leading-relaxed">
              Verificando credencial criptográfica emitida por el Tribunal
              Electoral e INADEH. Por favor, espere un momento...
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
              <Icon icon="solar:lock-keyhole-minimalistic-bold" />
              Canje seguro PKCE RFC 7636
            </div>
          </div>
        )}

        {/* Success State */}
        {status === "success" && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 sm:p-10 shadow-2xl border border-emerald-100 dark:border-emerald-900/40 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border-2 border-emerald-500/30 flex items-center justify-center mb-6 shadow-inner">
              <Icon
                icon="solar:verified-check-bold"
                className="text-emerald-500 text-4xl"
              />
            </div>

            <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 rounded-full mb-3">
              Identidad Verificada
            </span>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
              ¡Validación Facial Exitosa!
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6">
              Su identidad ha sido confirmada en tiempo real mediante los registros
              oficiales del Tribunal Electoral.
            </p>

            {/* Audit details box */}
            {resultData && (
              <div className="bg-gray-50 dark:bg-gray-900/70 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700 mb-6 text-left space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Cédula:
                  </span>
                  <span className="font-bold text-gray-900 dark:text-white text-base">
                    {resultData.cedula}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-500 dark:text-gray-400 font-medium">
                    Estado:
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <Icon icon="solar:check-circle-bold" className="text-base" />
                    {resultData.estado}
                  </span>
                </div>
                {resultData.id_auditoria && (
                  <div className="text-xs pt-2 border-t border-gray-200 dark:border-gray-800">
                    <span className="text-gray-400 dark:text-gray-500 block mb-1">
                      ID de Auditoría Legal:
                    </span>
                    <code className="text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 px-2 py-1 rounded border border-gray-200 dark:border-gray-700 font-mono text-[11px] break-all block">
                      {resultData.id_auditoria}
                    </code>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => redirectToEnrollment(false)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-full transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 flex items-center justify-center gap-2 text-base"
              >
                <span>Continuar a Inscripción</span>
                <Icon icon="solar:arrow-right-linear" className="w-5 h-5" />
              </button>

              <p className="text-xs text-gray-500 dark:text-gray-400">
                Redirigiendo automáticamente en{" "}
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {countdown}s
                </span>
                ...
              </p>
            </div>
          </div>
        )}

        {/* Rejected State */}
        {status === "rejected" && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 sm:p-10 shadow-2xl border border-amber-100 dark:border-amber-900/40 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto w-20 h-20 rounded-full bg-amber-50 dark:bg-amber-950/60 border-2 border-amber-500/30 flex items-center justify-center mb-6">
              <Icon
                icon="solar:shield-warning-bold"
                className="text-amber-500 text-4xl"
              />
            </div>

            <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 rounded-full mb-3">
              Atención
            </span>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Validación no completada
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 leading-relaxed">
              {errorMessage}
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => redirectToEnrollment(true)}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-full transition-all duration-300 shadow-lg flex items-center justify-center gap-2 text-base"
              >
                <span>Continuar con Registro Manual (Pendiente de Validación)</span>
                <Icon icon="solar:arrow-right-linear" className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => redirectToEnrollment(false)}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 px-6 rounded-full transition-all text-sm"
              >
                Volver a Opciones de Validación
              </button>
            </div>
          </div>
        )}

        {/* Error State */}
        {status === "error" && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 sm:p-10 shadow-2xl border border-red-100 dark:border-red-900/40 text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="mx-auto w-20 h-20 rounded-full bg-red-50 dark:bg-red-950/60 border-2 border-red-500/30 flex items-center justify-center mb-6">
              <Icon
                icon="solar:danger-circle-bold"
                className="text-red-500 text-4xl"
              />
            </div>

            <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/50 rounded-full mb-3">
              Error en Proceso
            </span>

            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              No se pudo verificar la identidad
            </h1>
            <p className="text-gray-600 dark:text-gray-300 text-sm mb-6 leading-relaxed">
              {errorMessage}
            </p>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => redirectToEnrollment(true)}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-full transition-all duration-300 shadow-lg flex items-center justify-center gap-2 text-base"
              >
                <span>Continuar con Validación Manual (Pendiente)</span>
                <Icon icon="solar:arrow-right-linear" className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={() => redirectToEnrollment(false)}
                className="w-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold py-3 px-6 rounded-full transition-all text-sm"
              >
                Volver a Opciones de Validación
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

export default function BiometriaCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
            <p className="mt-4 text-midnight_text dark:text-white text-base font-medium">
              Cargando respuesta de validación biométrica...
            </p>
          </div>
        </div>
      }
    >
      <BiometriaCallbackContent />
    </Suspense>
  );
}
