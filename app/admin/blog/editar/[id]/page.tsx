"use client";
import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import BlogEditor from "@/components/BlogEditor";

interface Blog {
  id: string;
  titulo: string;
  imagen_banner: string | null;
  palabras_clave: string[];
  contenido: unknown;
  estado: number;
  estado_nombre: string;
}

export default function EditarBlogPage() {
  const router = useRouter();
  const params = useParams();
  const [isLoading, setIsLoading] = useState(true);
  const [blog, setBlog] = useState<Blog | null>(null);

  const blogId = params.id as string;

  useEffect(() => {
    const loadBlog = async () => {
      try {
        setIsLoading(true);
        const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
        const response = await fetch(`${basePath}/api/admin/blog/${blogId}`);

        if (!response.ok) {
          throw new Error("Error al cargar el blog");
        }

        const data = await response.json();
        setBlog(data.data);
      } catch (error) {
        console.error("Error fetching blog:", error);
        toast.error("Error al cargar el blog");
        router.push("/admin/blog");
      } finally {
        setIsLoading(false);
      }
    };

    if (blogId) {
      loadBlog();
    }
  }, [blogId, router]);

  const handleCancel = () => {
    if (!confirm("¿Estás seguro de que deseas cancelar los cambios?")) {
      return;
    }
    router.push("/admin/blog");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
          <p className="mt-4 text-dark_grey dark:text-gray-400">
            Cargando blog...
          </p>
        </div>
      </div>
    );
  }

  if (!blog) {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Icon
            icon="solar:file-not-found-linear"
            className="w-16 h-16 text-gray-400 mx-auto mb-4"
          />
          <h2 className="text-xl font-semibold text-midnight_text dark:text-white mb-2">
            Blog no encontrado
          </h2>
          <p className="text-dark_grey dark:text-gray-400 mb-4">
            El blog que buscas no existe o no tienes permisos para editarlo.
          </p>
          <button
            onClick={() => router.push("/admin/blog")}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
          >
            Volver al listado
          </button>
        </div>
      </div>
    );
  }

  return <BlogEditor mode="edit" blog={blog} onCancel={handleCancel} />;
}
