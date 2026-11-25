import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { Icon } from "@iconify/react";
import Link from "next/link";
import SlateRenderer from "@/components/SlateRenderer";
import { JsonLdScript } from "@/components/JsonLdScript";
import { getPublishedBlog, type PublishedBlog } from "@/lib/blogPublic";
import { assetUrl } from "@/lib/basePath";

// Se consulta la base de datos directamente: antes se hacía un fetch HTTP a la
// propia API con una URL de producción ficticia ("yourdomain.com").
export const dynamic = "force-dynamic";

async function getBlog(id: string): Promise<PublishedBlog | null> {
  try {
    return await getPublishedBlog(id);
  } catch (error) {
    console.error("Error fetching blog:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const blog = await getBlog(id);

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
      images: blog.imagen_banner ? [assetUrl(blog.imagen_banner)] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: blog.titulo,
      description,
      images: blog.imagen_banner ? [assetUrl(blog.imagen_banner)] : undefined,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const blog = await getBlog(id);

  if (!blog) {
    notFound();
  }

  const formatDate = (dateString: string) => {
    // Zona fija: en el servidor no se puede depender de la TZ del proceso.
    return new Date(dateString).toLocaleDateString("es-PA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Panama",
    });
  };

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-1.5 text-xs text-dark_grey dark:text-gray-400 mb-3">
            <Link href="/blog" className="hover:text-primary transition-colors">
              Blog
            </Link>
            <Icon icon="solar:alt-arrow-right-linear" className="w-3 h-3" />
            <span className="text-midnight_text dark:text-white font-medium truncate max-w-[240px]">
              {blog.titulo}
            </span>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm text-dark_grey dark:text-gray-400 hover:text-primary transition-colors"
          >
            <Icon icon="solar:alt-arrow-left-linear" className="w-4 h-4" />
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
              <img
                src={assetUrl(blog.imagen_banner)}
                alt={blog.titulo}
                className="object-cover w-full h-full"
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
      <JsonLdScript
        data={{
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: blog.titulo,
          image: blog.imagen_banner ? [assetUrl(blog.imagen_banner)] : undefined,
          datePublished: blog.creado_en,
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
        }}
      />
    </div>
  );
}
