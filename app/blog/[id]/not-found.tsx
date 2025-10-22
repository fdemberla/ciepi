import Link from "next/link";
import { Icon } from "@iconify/react";

export default function BlogNotFound() {
  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <Icon
          icon="solar:document-remove-linear"
          className="w-24 h-24 text-dark_grey dark:text-gray-400 mx-auto mb-6"
        />

        <h1 className="text-4xl font-bold text-midnight_text dark:text-white mb-4">
          Blog no encontrado
        </h1>

        <p className="text-dark_grey dark:text-gray-400 mb-8">
          El artículo que buscas no existe o ya no está disponible. Puede que
          haya sido movido o eliminado.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Icon icon="solar:document-text-linear" className="w-5 h-5" />
            Ver todos los blogs
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-midnight_text dark:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
          >
            <Icon icon="solar:home-2-linear" className="w-5 h-5" />
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
