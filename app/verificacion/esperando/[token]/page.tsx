"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface TokenStatus {
  existe: boolean;
  usado: boolean;
  expirado: boolean;
  estado: "pendiente" | "verificado" | "expirado";
}

export default function EsperandoVerificacionPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [estado, setEstado] = useState<TokenStatus["estado"]>("pendiente");
  const [tiempoTranscurrido, setTiempoTranscurrido] = useState(0);
  const [intentosReenvio, setIntentosReenvio] = useState(0);
  const [reenviando, setReenviando] = useState(false);

  // Formatear tiempo transcurrido
  const formatearTiempo = (segundos: number) => {
    const minutos = Math.floor(segundos / 60);
    const segs = segundos % 60;
    return `${minutos}:${segs.toString().padStart(2, "0")}`;
  };

  // Verificar estado del token
  const verificarEstado = useCallback(async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(
        `${basePath}/api/verificacion/estado/${token}`
      );

      if (!response.ok) {
        if (response.status === 404) {
          setEstado("expirado");
          toast.error("Token no encontrado");
          return;
        }
        throw new Error("Error al verificar estado");
      }

      const data = await response.json();

      if (data.data.estado === "verificado") {
        setEstado("verificado");
        toast.success("¡Correo verificado exitosamente!");
        // Redirigir después de 2 segundos
        setTimeout(() => {
          router.push("/capacitaciones");
        }, 2000);
      } else if (data.data.estado === "expirado") {
        setEstado("expirado");
        toast.error("El enlace de verificación ha expirado");
      }
    } catch (error) {
      console.error("Error al verificar estado:", error);
    }
  }, [token, router]);

  // Polling cada 3 segundos
  useEffect(() => {
    if (estado === "pendiente") {
      const interval = setInterval(() => {
        verificarEstado();
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [estado, verificarEstado]);

  // Contador de tiempo
  useEffect(() => {
    const interval = setInterval(() => {
      setTiempoTranscurrido((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Verificación inicial
  useEffect(() => {
    verificarEstado();
  }, [verificarEstado]);

  // Reenviar correo
  const handleReenviar = async () => {
    setReenviando(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/verificacion/reenviar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Correo reenviado exitosamente");
        setIntentosReenvio((prev) => prev + 1);
        setTiempoTranscurrido(0);
        // Actualizar con el nuevo token
        router.replace(`/verificacion/esperando/${data.data.token}`);
      } else {
        toast.error(data.error || "Error al reenviar el correo");
      }
    } catch (error) {
      console.error("Error al reenviar:", error);
      toast.error("Error al reenviar el correo");
    } finally {
      setReenviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
          {/* Estado: Pendiente (Esperando) */}
          {estado === "pendiente" && (
            <div>
              <div className="text-center mb-8">
                <div className="mx-auto w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 relative">
                  <div className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
                  <svg
                    className="w-10 h-10 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                  Verifica tu Correo Electrónico
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 mb-2">
                  Hemos enviado un correo de verificación a tu dirección de
                  email.
                </p>
                <p className="text-slate-500 dark:text-slate-500 text-sm">
                  Por favor, revisa tu bandeja de entrada y haz clic en el
                  enlace de verificación.
                </p>
              </div>

              {/* Instrucciones */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 mb-6 border border-blue-200 dark:border-blue-800">
                <h3 className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Pasos a seguir:
                </h3>
                <ol className="space-y-2 text-slate-700 dark:text-slate-300">
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold mr-3 mt-0.5 flex-shrink-0">
                      1
                    </span>
                    <span>Abre tu correo electrónico</span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold mr-3 mt-0.5 flex-shrink-0">
                      2
                    </span>
                    <span>
                      Busca el correo de CIEPI - INADEH (revisa también en Spam)
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold mr-3 mt-0.5 flex-shrink-0">
                      3
                    </span>
                    <span>
                      Haz clic en el botón &quot;Verificar mi Correo&quot;
                    </span>
                  </li>
                  <li className="flex items-start">
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-sm font-bold mr-3 mt-0.5 flex-shrink-0">
                      4
                    </span>
                    <span>
                      Esta página se actualizará automáticamente cuando
                      verifiques
                    </span>
                  </li>
                </ol>
              </div>

              {/* Información de tiempo */}
              <div className="flex justify-between items-center mb-6 text-sm">
                <div className="text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Tiempo transcurrido:</span>{" "}
                  {formatearTiempo(tiempoTranscurrido)}
                </div>
                <div className="text-slate-600 dark:text-slate-400">
                  <span className="font-semibold">Expira en:</span>{" "}
                  {formatearTiempo(Math.max(0, 900 - tiempoTranscurrido))}
                </div>
              </div>

              {/* Progreso visual */}
              <div className="mb-6">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 transition-all duration-1000 ease-linear"
                    style={{
                      width: `${Math.min(
                        100,
                        (tiempoTranscurrido / 900) * 100
                      )}%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleReenviar}
                  disabled={reenviando || tiempoTranscurrido < 60}
                  className="flex-1 px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {reenviando ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Reenviando...
                    </span>
                  ) : tiempoTranscurrido < 60 ? (
                    `Reenviar (espera ${60 - tiempoTranscurrido}s)`
                  ) : (
                    "Reenviar Correo"
                  )}
                </button>
                <button
                  onClick={() => router.push("/capacitaciones")}
                  className="flex-1 px-6 py-3 bg-white hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-slate-100 font-semibold rounded-lg border border-slate-300 dark:border-slate-600 transition-colors duration-200"
                >
                  Cancelar
                </button>
              </div>

              {intentosReenvio > 0 && (
                <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-4">
                  Correo reenviado {intentosReenvio}{" "}
                  {intentosReenvio === 1 ? "vez" : "veces"}
                </p>
              )}
            </div>
          )}

          {/* Estado: Verificado */}
          {estado === "verificado" && (
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-12 h-12 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-green-600 dark:text-green-400 mb-4">
                ¡Correo Verificado!
              </h1>
              <p className="text-lg text-slate-700 dark:text-slate-300 mb-6">
                Tu correo electrónico ha sido verificado exitosamente.
              </p>
              <div className="inline-block animate-bounce">
                <svg
                  className="w-8 h-8 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-4">
                Redirigiendo automáticamente...
              </p>
            </div>
          )}

          {/* Estado: Expirado */}
          {estado === "expirado" && (
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-12 h-12 text-orange-600 dark:text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-orange-600 dark:text-orange-400 mb-4">
                Enlace Expirado
              </h1>
              <p className="text-lg text-slate-700 dark:text-slate-300 mb-6">
                El enlace de verificación ha expirado después de 15 minutos.
              </p>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                No te preocupes, puedes solicitar un nuevo correo de
                verificación.
              </p>
              <button
                onClick={handleReenviar}
                disabled={reenviando}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200 disabled:opacity-50"
              >
                {reenviando
                  ? "Reenviando..."
                  : "Reenviar Correo de Verificación"}
              </button>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Centro de Innovación y Emprendimiento (CIEPI) - INADEH
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
            Esta página se actualiza automáticamente cada 3 segundos
          </p>
        </div>
      </div>
    </div>
  );
}
