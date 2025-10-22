import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@iconify/react";
import Link from "next/link";
import Image from "next/image";
import SlateRenderer from "@/components/SlateRenderer";

interface Blog {
  id: string;
  titulo: string;
  imagen_banner: string | null;
  palabras_clave: string[];
  contenido: unknown;
  creado_en: string;
  autor_nombre: string;
  autor_email: string;
}

interface BlogResponse {
  success: boolean;
  data: Blog;
}

async function getBlog(id: string): Promise<Blog | null> {
  try {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.NODE_ENV === "production"
      ? "https://yourdomain.com"
      : "http://localhost:3000";

    const response = await fetch(`${baseUrl}${basePath}/api/blog/${id}`, {
      next: { revalidate: 3600 }, // Revalidate every hour
    });

    if (!response.ok) {
      return null;
    }

    const result: BlogResponse = await response.json();
    return result.success ? result.data : null;
  } catch (error) {
    console.error("Error fetching blog:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const blog = await getBlog(params.id);

  if (!blog) {
    return {
      title: "Blog no encontrado - CIEPI",
      description: "El blog solicitado no existe o no está disponible.",
    };
  }

  // Extract plain text from content for description
  const getTextFromContent = (content: unknown): string => {
    if (!content || !Array.isArray(content)) return "";

    const textParts: string[] = [];
    const extractText = (nodes: unknown[]): void => {
      nodes.forEach((node) => {
        if (node && typeof node === "object") {
          const nodeObj = node as Record<string, unknown>;
          if (nodeObj.children && Array.isArray(nodeObj.children)) {
            extractText(nodeObj.children);
          } else if (nodeObj.text && typeof nodeObj.text === "string") {
            textParts.push(nodeObj.text);
          }
        }
      });
    };

    extractText(content);
    return textParts.join(" ").slice(0, 160);
  };

  const description = getTextFromContent(blog.contenido) || blog.titulo;

  return {
    title: `${blog.titulo} - Blog CIEPI`,
    description,
    keywords: blog.palabras_clave?.join(", "),
    authors: [{ name: blog.autor_nombre }],
    openGraph: {
      title: blog.titulo,
      description,
      type: "article",
      publishedTime: blog.creado_en,
      authors: [blog.autor_nombre],
      images: blog.imagen_banner ? [blog.imagen_banner] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: blog.titulo,
      description,
      images: blog.imagen_banner ? [blog.imagen_banner] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: { id: string };
}) {
  const blog = await getBlog(params.id);

  if (!blog) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900">
      {/* Back Button */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <Icon icon="solar:arrow-left-linear" className="w-5 h-5" />
            Volver al blog
          </Link>
        </div>
      </div>

      <article className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-midnight_text dark:text-white mb-6 leading-tight">
            {blog.titulo}
          </h1>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-4 text-dark_grey dark:text-gray-400 mb-6">
            <div className="flex items-center gap-2">
              <Icon icon="solar:calendar-linear" className="w-5 h-5" />
              <span>Publicado el {formatDate(blog.creado_en)}</span>
            </div>

            {blog.autor_nombre && (
              <div className="flex items-center gap-2">
                <Icon icon="solar:user-linear" className="w-5 h-5" />
                <span>Por {blog.autor_nombre}</span>
              </div>
            )}
          </div>

          {/* Keywords */}
          {blog.palabras_clave && blog.palabras_clave.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              {blog.palabras_clave.map((keyword, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full font-medium"
                >
                  {keyword}
                </span>
              ))}
            </div>
          )}

          {/* Featured Image */}
          {blog.imagen_banner && (
            <div className="relative w-full h-64 md:h-96 rounded-xl overflow-hidden mb-8 shadow-lg">
              <Image
                src={blog.imagen_banner}
                alt={blog.titulo}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 100vw, 896px"
              />
            </div>
          )}
        </header>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8">
          <div className="prose prose-lg dark:prose-invert max-w-none">
            <SlateRenderer content={blog.contenido} />
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-midnight_text dark:text-white mb-2">
                ¿Te gustó este artículo?
              </h3>
              <p className="text-dark_grey dark:text-gray-400">
                Compártelo con tus colegas y síguenos para más contenido de
                investigación económica.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                <Icon icon="solar:share-linear" className="w-5 h-5" />
                Compartir
              </button>

              <Link
                href="/blog"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Icon icon="solar:document-text-linear" className="w-5 h-5" />
                Más artículos
              </Link>
            </div>
          </div>
        </footer>
      </article>

      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: blog.titulo,
            image: blog.imagen_banner ? [blog.imagen_banner] : undefined,
            datePublished: blog.creado_en,
            dateModified: blog.fecha_actualizacion,
            author: {
              "@type": "Person",
              name: blog.autor_nombre,
            },
            publisher: {
              "@type": "Organization",
              name: "CIEPI",
            },
            description: blog.titulo,
            keywords: blog.palabras_clave?.join(", "),
          }),
        }}
      />
    </div>
  );
}
