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
    capacitacion?: {
      nombre: string;
      fecha_inicio_capacitacion: string;
    };
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
  const [capacitacionData, setCapacitacionData] = useState<{
    nombre: string;
    fecha_inicio_capacitacion: string;
  } | null>(null);

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
          if (data.data?.capacitacion) {
            setCapacitacionData(data.data.capacitacion);
          }
          toast.success("¡Correo verificado e inscripción confirmada!");
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
    <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-3xl w-full">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 border border-gray-200 dark:border-gray-700">
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
              {/* Success Icon */}
              <div className="mx-auto w-20 h-20 bg-gradient-to-br from-success/20 to-success/10 dark:from-success/30 dark:to-success/20 rounded-full flex items-center justify-center mb-6 shadow-lg">
                <svg
                  className="w-12 h-12 text-success"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2.5}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>

              {/* Main Heading */}
              <h1 className="text-3xl sm:text-4xl font-bold text-success mb-3">
                ¡Inscripción Confirmada!
              </h1>

              <p className="text-lg text-midnight_text dark:text-white mb-8">
                Tu correo ha sido verificado exitosamente
              </p>

              {/* Student Info Card */}
              {estudianteData && (
                <div className="bg-slateGray dark:bg-gray-700 rounded-2xl p-6 mb-6 border-2 border-success/30">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <svg
                      className="w-6 h-6 text-success"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <h3 className="text-xl font-bold text-midnight_text dark:text-white">
                      Información del Participante
                    </h3>
                  </div>
                  <div className="space-y-3 text-left">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-midnight_text dark:text-white min-w-[80px]">
                        Nombre:
                      </span>
                      <span className="text-midnight_text dark:text-gray-300">
                        {estudianteData.nombres} {estudianteData.apellidos}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-midnight_text dark:text-white min-w-[80px]">
                        Correo:
                      </span>
                      <span className="text-midnight_text dark:text-gray-300 break-all">
                        {estudianteData.correo}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Capacitacion Info Card */}
              {capacitacionData && (
                <div className="bg-gradient-to-br from-primary/10 to-secondary/10 dark:from-primary/20 dark:to-secondary/20 rounded-2xl p-6 mb-8 border-2 border-primary/30 dark:border-primary/40">
                  <div className="flex items-center justify-center gap-3 mb-4">
                    <svg
                      className="w-6 h-6 text-primary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    <h3 className="text-xl font-bold text-primary dark:text-primary/90">
                      Capacitación Inscrita
                    </h3>
                  </div>
                  <div className="space-y-3 text-left">
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-midnight_text dark:text-white min-w-[100px]">
                        Curso:
                      </span>
                      <span className="text-midnight_text dark:text-gray-300 font-medium">
                        {capacitacionData.nombre}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="font-semibold text-midnight_text dark:text-white min-w-[100px]">
                        Fecha Inicio:
                      </span>
                      <span className="text-midnight_text dark:text-gray-300">
                        {new Date(
                          capacitacionData.fecha_inicio_capacitacion
                        ).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-white font-semibold text-lg rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                  />
                </svg>
                Volver a Página Principal
              </button>
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
          <p className="text-sm text-dark_grey dark:text-gray-400">
            Centro de Innovación y Emprendimiento Productivo (CIEPI) - INADEH
          </p>
        </div>
      </div>
    </div>
  );
}
