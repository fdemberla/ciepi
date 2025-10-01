"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const normalizedBasePath = rawBasePath
  ? `/${rawBasePath.replace(/^\/+|\/+$/g, "")}`
  : "";

console.log("🔍 [Admin Login] Debug Info:");
console.log("  - rawBasePath:", rawBasePath);
console.log("  - normalizedBasePath:", normalizedBasePath);
console.log(
  "  - NEXT_PUBLIC_BASE_PATH env:",
  process.env.NEXT_PUBLIC_BASE_PATH
);

const withBasePath = (pathname: string) => {
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const result = `${normalizedBasePath}${normalizedPath}` || normalizedPath;
  console.log(`  - withBasePath("${pathname}") => "${result}"`);
  return result;
};

const AdminLogin = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSamlLogin = async () => {
    setIsLoading(true);
    setError("");
    try {
      // Redirect to capacitaciones after successful login
      const callbackUrl = withBasePath("/admin/capacitaciones");
      console.log("🔍 [signIn] Calling signIn with callbackUrl:", callbackUrl);
      await signIn("azure-ad", { callbackUrl });
    } catch (error) {
      console.error("Azure AD sign-in failed", error);
      setError("Error al conectar con Microsoft. Intente nuevamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
            <svg
              className="h-6 w-6 text-blue-600"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Portal de Administración
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Autenticación con Microsoft
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-6">
              Para acceder al portal de administración, inicie sesión con su
              cuenta de Microsoft.
            </p>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error de autenticación
                  </h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={handleSamlLogin}
              disabled={isLoading}
              className="group relative w-full flex justify-center items-center py-3 px-4 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
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
                  Conectando con Microsoft...
                </div>
              ) : (
                <div className="flex items-center">
                  {/* Microsoft Logo */}
                  <svg
                    className="w-5 h-5 mr-3"
                    viewBox="0 0 23 23"
                    fill="currentColor"
                  >
                    <path d="M11 11H0V0h11v11z" fill="#f25022" />
                    <path d="M23 11H12V0h11v11z" fill="#00a4ef" />
                    <path d="M11 23H0V12h11v11z" fill="#ffb900" />
                    <path d="M23 23H12V12h11v11z" fill="#737373" />
                  </svg>
                  Iniciar Sesión con Microsoft
                </div>
              )}
            </button>
          </div>

          <div className="text-center text-xs text-gray-500 mt-4">
            <p>
              Al continuar, será redirigido a Microsoft para autenticarse de
              forma segura.
            </p>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
            >
              ← Volver al inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
