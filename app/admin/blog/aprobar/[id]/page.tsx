"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import AdminProtection from "@/components/AdminProtection";
import SlateRenderer from "@/components/SlateRenderer";
import BlogAccionesEstado, {
  BlogHistorial,
  type EntradaHistorialBlog,
  type TransicionBlog,
} from "@/components/BlogAccionesEstado";
import { assetUrl } from "@/lib/basePath";

interface Blog {
  id: string;
  titulo: string;
  contenido: unknown;
  imagen_banner: string | null;
  palabras_clave: string[];
  creado_por: string;
  autor_nombre: string;
  creado_en: string;
  estado: number;
  estado_nombre: string;
  aprobado_por: string | null;
  aprobado_por_nombre: string | null;
  aprobado_en: string | null;
  es_autor: boolean;
  transiciones: TransicionBlog[];
  historial: EntradaHistorialBlog[];
}

export default function AprobarBlogPage() {
  const router = useRouter();
  const params = useParams();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);

  const blogId = params.id as string;

  const fetchBlog = useCallback(async () => {
    try {
      setLoading(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/blog/${blogId}`);

      if (!response.ok) {
        throw new Error("Error al cargar el blog");
      }

      const result = await response.json();
      if (result.success) {
        setBlog(result.data);
      } else {
        throw new Error(result.error || "Error al cargar el blog");
      }
    } catch (error) {
      console.error("Error fetching blog:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al cargar el blog"
      );
      router.push("/admin/blog");
    } finally {
      setLoading(false);
    }
  }, [blogId, router]);

  useEffect(() => {
    if (blogId) {
      fetchBlog();
    }
  }, [blogId, fetchBlog]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEstadoBadge = (estado: number, estadoNombre: string) => {
    const badges = {
      1: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300", // Borrador
      2: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300", // En Revisión CIEPI
      3: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", // Rechazado por CIEPI
      4: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300", // En Revisión RR.PP
      5: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300", // Rechazado por RR.PP
      6: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300", // Publicado
    };

    return (
      <span
        className={`px-3 py-1 rounded-full text-sm font-semibold ${
          badges[estado as keyof typeof badges]
        }`}
      >
        {estadoNombre}
      </span>
    );
  };

  if (loading) {
    return (
      <AdminProtection>
        <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AdminProtection>
    );
  }

  if (!blog) {
    return (
      <AdminProtection>
        <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
          <div className="text-center">
            <Icon
              icon="solar:document-remove-linear"
              className="w-16 h-16 text-dark_grey dark:text-gray-400 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-midnight_text dark:text-white">
              Blog no encontrado
            </h1>
          </div>
        </div>
      </AdminProtection>
    );
  }

  return (
    <AdminProtection>
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-8">
        <div className="max-w-4xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <button
              type="button"
              onClick={() => router.push("/admin/blog")}
              aria-label="Volver al listado de blogs"
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Icon
                icon="solar:arrow-left-linear"
                className="w-6 h-6 text-midnight_text dark:text-white"
                aria-hidden="true"
              />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-midnight_text dark:text-white">
                Revisión del blog
              </h1>
              <p className="text-dark_grey dark:text-gray-400">
                Revisa el contenido y decide el siguiente paso según tu rol
              </p>
            </div>
          </div>

          {/* Blog Info Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-midnight_text dark:text-white mb-2">
                  {blog.titulo}
                </h2>
                <div className="flex items-center gap-4 text-sm text-dark_grey dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Icon icon="solar:user-linear" className="w-4 h-4" />
                    <span>Por {blog.autor_nombre}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Icon icon="solar:calendar-linear" className="w-4 h-4" />
                    <span>Creado el {formatDate(blog.creado_en)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {getEstadoBadge(blog.estado, blog.estado_nombre)}
              </div>
            </div>

            {/* Keywords */}
            {blog.palabras_clave && blog.palabras_clave.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-midnight_text dark:text-white mb-2">
                  Palabras Clave:
                </h3>
                <div className="flex flex-wrap gap-2">
                  {blog.palabras_clave.map((keyword, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-primary/10 text-primary text-sm rounded-full"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Featured Image */}
            {blog.imagen_banner && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-midnight_text dark:text-white mb-2">
                  Imagen Banner:
                </h3>
                <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                  <img
                    src={assetUrl(blog.imagen_banner)}
                    alt={blog.titulo}
                    className="object-cover w-full h-full"
                  />
                </div>
              </div>
            )}

            {/* Content Preview */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-midnight_text dark:text-white mb-2">
                Vista previa del contenido:
              </h3>
              <div className="max-h-[32rem] overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-midnight_text dark:text-white">
                  {Array.isArray(blog.contenido) ? (
                    <SlateRenderer content={blog.contenido} />
                  ) : (
                    <p className="italic text-dark_grey dark:text-gray-400">
                      [Sin contenido]
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Action Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-midnight_text dark:text-white mb-4">
                Acciones disponibles
              </h3>
              {blog.es_autor && [2, 4].includes(blog.estado) && (
                <p className="mb-4 text-sm text-amber-700 dark:text-amber-300">
                  Eres el autor de este blog: la revisión debe hacerla otra persona.
                </p>
              )}
              <BlogAccionesEstado
                blogId={blog.id}
                titulo={blog.titulo}
                estadoActual={blog.estado}
                transiciones={blog.transiciones}
                onCambio={() => fetchBlog()}
              />
            </div>
          </div>

          {/* Historial */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
            <h3 className="text-lg font-semibold text-midnight_text dark:text-white mb-4">
              Historial de estados
            </h3>
            <BlogHistorial historial={blog.historial} />
          </div>
        </div>
      </div>
    </AdminProtection>
  );
}
