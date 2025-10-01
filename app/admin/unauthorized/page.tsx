"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function UnauthorizedPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          {/* Icon */}
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-10 h-10 text-red-600"
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

          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Acceso No Autorizado
          </h1>

          {session ? (
            <>
              <p className="text-gray-600 mb-6">
                Tu cuenta <strong>{session.user?.email}</strong> no tiene
                permisos de administrador.
              </p>
              <p className="text-gray-600 mb-6">
                Si crees que esto es un error, contacta al administrador del
                sistema.
              </p>
            </>
          ) : (
            <p className="text-gray-600 mb-6">
              Necesitas iniciar sesión con una cuenta de administrador para
              acceder a esta sección.
            </p>
          )}

          <div className="flex flex-col gap-3">
            <Link
              href="/ciepi/"
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Volver al Inicio
            </Link>
            {!session && (
              <Link
                href="/ciepi/admin/login"
                className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 text-sm text-gray-500">
          <p>¿Necesitas acceso de administrador?</p>
          <p className="mt-1">
            Contacta al equipo de CIEPI para solicitar permisos.
          </p>
        </div>
      </div>
    </div>
  );
}
