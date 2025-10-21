"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const getErrorMessage = () => {
    switch (error) {
      case "AccessDenied":
        return {
          title: "Acceso Denegado",
          description:
            "Su cuenta no tiene permisos para acceder al portal administrativo de CIEPI.",
          details:
            "Solo los usuarios registrados en el sistema de administración pueden acceder. Si cree que esto es un error, contacte al administrador del sistema.",
        };
      case "Configuration":
        return {
          title: "Error de Configuración",
          description:
            "Hubo un problema con la configuración de autenticación.",
          details:
            "Por favor, contacte al equipo de soporte técnico para resolver este problema.",
        };
      case "Verification":
        return {
          title: "Error de Verificación",
          description: "No se pudo verificar su identidad.",
          details:
            "Por favor, intente iniciar sesión nuevamente. Si el problema persiste, contacte al administrador.",
        };
      default:
        return {
          title: "Error de Autenticación",
          description: "Ocurrió un error durante el proceso de autenticación.",
          details:
            "Por favor, intente iniciar sesión nuevamente. Si el problema persiste, contacte al administrador del sistema.",
        };
    }
  };

  const errorInfo = getErrorMessage();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        {/* Icon */}
        <div className="flex justify-center">
          <div className="rounded-full bg-red-100 dark:bg-red-900/20 p-6">
            <svg
              className="h-16 w-16 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {errorInfo.title}
        </h1>

        {/* Description */}
        <p className="text-lg text-gray-600 dark:text-gray-300">
          {errorInfo.description}
        </p>

        {/* Details */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {errorInfo.details}
          </p>
        </div>

        {/* Error code */}
        {error && (
          <p className="text-xs text-gray-500 dark:text-gray-500 font-mono">
            Código de error: {error}
          </p>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Link
            href="/"
            className="block w-full bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl"
          >
            Volver al Inicio
          </Link>
          <Link
            href="/admin/login"
            className="block w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-midnight_text dark:text-white font-semibold py-3 px-6 rounded-full transition-all duration-300"
          >
            Intentar Iniciar Sesión Nuevamente
          </Link>
        </div>
      </div>
    </div>
  );
}
