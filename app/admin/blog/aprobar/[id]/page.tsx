"use client";
import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Image from "next/image";
import AdminProtection from "@/components/AdminProtection";

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
  historial_estados: unknown;
}

export default function AprobarBlogPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session } = useSession();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [comentario, setComentario] = useState("");

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

  const handleApproval = async () => {
    if (!blog || !session?.user?.isAdmin) return;

    try {
      setProcessing(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

      const response = await fetch(`${basePath}/api/admin/blog/${blogId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estado: 6, // Publicado
          comentario:
            comentario.trim() ||
            "Aprobado por Relaciones Públicas para publicación",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al aprobar el blog");
      }

      const result = await response.json();

      if (result.success) {
        toast.success("¡Blog aprobado y publicado exitosamente!");
        router.push("/admin/blog");
      } else {
        throw new Error(result.error || "Error al aprobar el blog");
      }
    } catch (error) {
      console.error("Error approving blog:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al aprobar el blog"
      );
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!blog || !session?.user?.isAdmin) return;

    if (!comentario.trim()) {
      toast.error("Debes proporcionar un comentario para rechazar el blog");
      return;
    }

    try {
      setProcessing(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

      const response = await fetch(`${basePath}/api/admin/blog/${blogId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          estado: 5, // Rechazado por Relaciones Públicas
          comentario: comentario.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al rechazar el blog");
      }

      const result = await response.json();

      if (result.success) {
        toast.success("Blog rechazado. Se ha notificado al autor.");
        router.push("/admin/blog");
      } else {
        throw new Error(result.error || "Error al rechazar el blog");
      }
    } catch (error) {
      console.error("Error rejecting blog:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al rechazar el blog"
      );
    } finally {
      setProcessing(false);
    }
  };

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

  // Verificar que el blog esté en estado correcto para aprobar por RR.PP
  if (blog.estado !== 4) {
    return (
      <AdminProtection>
        <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-8">
          <div className="max-w-4xl mx-auto px-4">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
              <div className="flex items-start gap-3">
                <Icon
                  icon="solar:info-circle-linear"
                  className="w-6 h-6 text-yellow-600 dark:text-yellow-400 mt-0.5"
                />
                <div>
                  <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                    Estado incorrecto para aprobación
                  </h3>
                  <p className="text-yellow-700 dark:text-yellow-300 mb-4">
                    Este blog no está en estado &ldquo;En Revisión Relaciones
                    Públicas&rdquo;. Estado actual:{" "}
                    <strong>{blog.estado_nombre}</strong>
                  </p>
                  <button
                    onClick={() => router.push("/admin/blog")}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                  >
                    <Icon icon="solar:arrow-left-linear" className="w-4 h-4" />
                    Volver a la lista
                  </button>
                </div>
              </div>
            </div>
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
              onClick={() => router.push("/admin/blog")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Icon
                icon="solar:arrow-left-linear"
                className="w-6 h-6 text-midnight_text dark:text-white"
              />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-midnight_text dark:text-white">
                Aprobar Publicación - Relaciones Públicas
              </h1>
              <p className="text-dark_grey dark:text-gray-400">
                Revisa y aprueba este blog para su publicación final
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
                  <Image
                    src={blog.imagen_banner}
                    alt={blog.titulo}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 896px"
                  />
                </div>
              </div>
            )}

            {/* Content Preview */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-midnight_text dark:text-white mb-2">
                Vista previa del contenido:
              </h3>
              <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <div className="text-sm text-midnight_text dark:text-white">
                  {/* Simple content preview - you could enhance this with SlateRenderer */}
                  <p className="italic text-dark_grey dark:text-gray-400">
                    [Vista previa del contenido - Se mostrará el contenido
                    completo una vez publicado]
                  </p>
                </div>
              </div>
            </div>

            {/* Action Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <h3 className="text-lg font-semibold text-midnight_text dark:text-white mb-4">
                Decisión de Publicación
              </h3>

              <div className="mb-4">
                <label className="block text-sm font-medium text-midnight_text dark:text-white mb-2">
                  Comentario (opcional para aprobación, requerido para rechazo)
                </label>
                <textarea
                  value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  placeholder="Agregar comentario sobre la decisión de publicación..."
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-midnight_text dark:text-white resize-none"
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={handleApproval}
                  disabled={processing}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                    processing
                      ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white"
                      : "bg-green-600 text-white hover:bg-green-700"
                  }`}
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Icon
                        icon="solar:check-circle-linear"
                        className="w-5 h-5"
                      />
                      Aprobar y Publicar
                    </>
                  )}
                </button>

                <button
                  onClick={handleReject}
                  disabled={processing}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                    processing
                      ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed text-white"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Icon
                        icon="solar:close-circle-linear"
                        className="w-5 h-5"
                      />
                      Rechazar
                    </>
                  )}
                </button>
              </div>

              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-start gap-3">
                  <Icon
                    icon="solar:info-circle-linear"
                    className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5"
                  />
                  <div className="text-sm text-blue-700 dark:text-blue-300">
                    <strong>Aprobar:</strong> El blog se publicará
                    inmediatamente y estará visible para todos los usuarios.
                    <br />
                    <strong>Rechazar:</strong> El blog volverá al autor con tus
                    comentarios para revisión.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminProtection>
  );
}
