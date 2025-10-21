"use client";
import Link from "next/link";
import { useSession } from "next-auth/react";

export default function UnauthorizedPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Icon */}
          <div className="mx-auto w-20 h-20 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <svg
              className="w-12 h-12 text-red-600 dark:text-red-500"
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

          <h1 className="text-2xl font-bold text-midnight_text dark:text-white mb-2">
            Acceso No Autorizado
          </h1>

          {session ? (
            <>
              <p className="text-dark_grey dark:text-gray-300 mb-6">
                Tu cuenta <strong>{session.user?.email}</strong> no tiene
                permisos de administrador.
              </p>
              <p className="text-dark_grey dark:text-gray-300 mb-6">
                Si crees que esto es un error, contacta al administrador del
                sistema.
              </p>
            </>
          ) : (
            <p className="text-dark_grey dark:text-gray-300 mb-6">
              Necesitas iniciar sesión con una cuenta de administrador para
              acceder a esta sección.
            </p>
          )}

          <div className="flex flex-col gap-3">
            <Link
              href="/ciepi/"
              className="bg-primary text-white px-6 py-3 rounded-full hover:bg-primary/90 transition-all duration-300 font-medium shadow-lg hover:shadow-xl"
            >
              Volver al Inicio
            </Link>
            {!session && (
              <Link
                href="/ciepi/admin/login"
                className="bg-gray-200 dark:bg-gray-700 text-midnight_text dark:text-white px-6 py-3 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition-all duration-300 font-medium"
              >
                Iniciar Sesión
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 text-sm text-dark_grey dark:text-gray-400">
          <p>¿Necesitas acceso de administrador?</p>
          <p className="mt-1">
            Contacta al equipo de CIEPI para solicitar permisos.
          </p>
        </div>
      </div>
    </div>
  );
}
