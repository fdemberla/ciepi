"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface EstudianteData {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string;
}

interface VerificationResult {
  success: boolean;
  message?: string;
  error?: string;
  code?: string;
  data?: {
    estudiante: EstudianteData;
    tipo: string;
    inscripcion_id?: number;
    estado_inscripcion?: number;
  };
}

export default function VerificarCorreoPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [estado, setEstado] = useState<
    "loading" | "success" | "error" | "expired" | "used"
  >("loading");
  const [mensaje, setMensaje] = useState<string>("");
  const [estudianteData, setEstudianteData] = useState<EstudianteData | null>(
    null
  );

  useEffect(() => {
    const verificarToken = async () => {
      try {
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const response = await fetch(
          `${basePath}/api/verificacion/validar/${token}`,
          {
            method: "POST",
          }
        );

        const data: VerificationResult = await response.json();

        if (data.success) {
          setEstado("success");
          setMensaje(
            data.message || "¡Tu correo ha sido verificado exitosamente!"
          );
          if (data.data?.estudiante) {
            setEstudianteData(data.data.estudiante);
          }
          toast.success("¡Correo verificado exitosamente!");

          // Redirigir después de 3 segundos
          setTimeout(() => {
            router.push("/capacitaciones");
          }, 3000);
        } else {
          // Manejar diferentes tipos de error
          if (data.code === "TOKEN_EXPIRED") {
            setEstado("expired");
            setMensaje(data.error || "El enlace ha expirado");
            toast.error("El enlace de verificación ha expirado");
          } else if (data.code === "TOKEN_ALREADY_USED") {
            setEstado("used");
            setMensaje(data.error || "Este enlace ya fue usado");
            toast.error("Este enlace ya fue usado anteriormente");
          } else {
            setEstado("error");
            setMensaje(data.error || "Error al verificar el correo");
            toast.error(data.error || "Error al verificar");
          }
        }
      } catch (error) {
        console.error("Error al verificar token:", error);
        setEstado("error");
        setMensaje("Error al conectar con el servidor");
        toast.error("Error al verificar el correo");
      }
    };

    if (token) {
      verificarToken();
    }
  }, [token, router]);

  const handleReenviar = async () => {
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
        // Redirigir a la página de espera con el nuevo token
        router.push(`/verificacion/esperando/${data.data.token}`);
      } else {
        toast.error(data.error || "Error al reenviar el correo");
      }
    } catch (error) {
      console.error("Error al reenviar:", error);
      toast.error("Error al reenviar el correo");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 border border-slate-200 dark:border-slate-700">
          {/* Loading State */}
          {estado === "loading" && (
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent mb-6"></div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                Verificando tu correo...
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Por favor espera un momento
              </p>
            </div>
          )}

          {/* Success State */}
          {estado === "success" && (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-10 h-10 text-green-600 dark:text-green-400"
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
                ¡Verificación Exitosa!
              </h1>
              <p className="text-lg text-slate-700 dark:text-slate-300 mb-6">
                {mensaje}
              </p>
              {estudianteData && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 mb-6 border border-green-200 dark:border-green-800">
                  <p className="text-slate-700 dark:text-slate-300">
                    <strong>Nombre:</strong> {estudianteData.nombres}{" "}
                    {estudianteData.apellidos}
                  </p>
                  <p className="text-slate-700 dark:text-slate-300 mt-2">
                    <strong>Correo:</strong> {estudianteData.correo}
                  </p>
                </div>
              )}
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Serás redirigido automáticamente...
              </p>
            </div>
          )}

          {/* Expired State */}
          {estado === "expired" && (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-10 h-10 text-orange-600 dark:text-orange-400"
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
                {mensaje}
              </p>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                El enlace de verificación ha expirado. Puedes solicitar uno
                nuevo haciendo clic en el botón de abajo.
              </p>
              <button
                onClick={handleReenviar}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
              >
                Reenviar Correo de Verificación
              </button>
            </div>
          )}

          {/* Already Used State */}
          {estado === "used" && (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
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
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                Enlace Ya Utilizado
              </h1>
              <p className="text-lg text-slate-700 dark:text-slate-300 mb-6">
                {mensaje}
              </p>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Este enlace ya fue usado anteriormente. Tu correo ya está
                verificado.
              </p>
              <button
                onClick={() => router.push("/capacitaciones")}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
              >
                Ir a Capacitaciones
              </button>
            </div>
          )}

          {/* Error State */}
          {estado === "error" && (
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-6">
                <svg
                  className="w-10 h-10 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-red-600 dark:text-red-400 mb-4">
                Error de Verificación
              </h1>
              <p className="text-lg text-slate-700 dark:text-slate-300 mb-6">
                {mensaje}
              </p>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Ha ocurrido un error al verificar tu correo. Por favor, intenta
                nuevamente o contacta con soporte.
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleReenviar}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors duration-200"
                >
                  Reenviar Correo
                </button>
                <button
                  onClick={() => router.push("/capacitaciones")}
                  className="px-6 py-3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-900 dark:text-slate-100 font-semibold rounded-lg transition-colors duration-200"
                >
                  Volver al Inicio
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Centro de Innovación y Emprendimiento (CIEPI) - INADEH
          </p>
        </div>
      </div>
    </div>
  );
}
