"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import Link from "next/link";
import Image from "next/image";

interface Blog {
  id: string;
  titulo: string;
  imagen_banner: string | null;
  palabras_clave: string[];
  fecha_creacion: string;
  fecha_actualizacion: string;
  contenido_preview: string;
  autor_nombre: string;
}

interface BlogsResponse {
  success: boolean;
  data: Blog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function BlogPage() {
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("fecha_creacion");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  });

  const fetchBlogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "12",
        search: searchTerm,
        sortBy,
        sortOrder,
      });

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/blog?${params}`);

      if (!response.ok) {
        throw new Error("Error al cargar blogs");
      }

      const result: BlogsResponse = await response.json();
      setBlogs(result.data);
      setPagination(result.pagination);
    } catch (error) {
      console.error("Error fetching blogs:", error);
      setBlogs([]);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    fetchBlogs();
  }, [currentPage, sortBy, sortOrder, fetchBlogs]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
      fetchBlogs();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, fetchBlogs]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleSortChange = (newSortBy: string) => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/10 to-transparent py-16">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-midnight_text dark:text-white mb-4">
            Blog CIEPI
          </h1>
          <p className="text-lg text-dark_grey dark:text-gray-400 max-w-2xl mx-auto">
            Descubre las últimas investigaciones, análisis y reflexiones del
            Centro de Investigación en Economía y Políticas Internacionales
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Icon
                icon="solar:magnifer-linear"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark_grey dark:text-gray-400 w-5 h-5"
              />
              <input
                type="text"
                placeholder="Buscar por título o palabras clave..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-midnight_text dark:text-white placeholder:text-dark_grey dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-midnight_text dark:text-white">
                Ordenar por:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSortChange("fecha_creacion")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === "fecha_creacion"
                      ? "bg-primary text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-midnight_text dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  Fecha
                  {sortBy === "fecha_creacion" && (
                    <Icon
                      icon={
                        sortOrder === "asc"
                          ? "solar:arrow-up-linear"
                          : "solar:arrow-down-linear"
                      }
                      className="w-4 h-4"
                    />
                  )}
                </button>
                <button
                  onClick={() => handleSortChange("titulo")}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    sortBy === "titulo"
                      ? "bg-primary text-white"
                      : "bg-gray-100 dark:bg-gray-700 text-midnight_text dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600"
                  }`}
                >
                  Título
                  {sortBy === "titulo" && (
                    <Icon
                      icon={
                        sortOrder === "asc"
                          ? "solar:arrow-up-linear"
                          : "solar:arrow-down-linear"
                      }
                      className="w-4 h-4"
                    />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm text-dark_grey dark:text-gray-400">
              {loading
                ? "Cargando..."
                : `${pagination.total} blog${
                    pagination.total !== 1 ? "s" : ""
                  } encontrado${pagination.total !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>

        {/* Blog Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-16">
            <Icon
              icon="solar:document-text-linear"
              className="w-16 h-16 text-dark_grey dark:text-gray-400 mx-auto mb-4"
            />
            <h3 className="text-xl font-semibold text-midnight_text dark:text-white mb-2">
              No se encontraron blogs
            </h3>
            <p className="text-dark_grey dark:text-gray-400">
              {searchTerm
                ? "Intenta con otros términos de búsqueda"
                : "Aún no hay blogs publicados"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogs.map((blog) => (
              <article
                key={blog.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
              >
                {/* Blog Image */}
                <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                  {blog.imagen_banner ? (
                    <Image
                      src={blog.imagen_banner}
                      alt={blog.titulo}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <Icon
                        icon="solar:document-text-linear"
                        className="w-12 h-12 text-dark_grey dark:text-gray-400"
                      />
                    </div>
                  )}
                </div>

                {/* Blog Content */}
                <div className="p-6">
                  <div className="flex items-center gap-2 text-sm text-dark_grey dark:text-gray-400 mb-3">
                    <Icon icon="solar:calendar-linear" className="w-4 h-4" />
                    <span>{formatDate(blog.creado_en)}</span>
                    {blog.autor_nombre && (
                      <>
                        <span>•</span>
                        <span>Por {blog.autor_nombre}</span>
                      </>
                    )}
                  </div>

                  <h2 className="text-xl font-bold text-midnight_text dark:text-white mb-3 line-clamp-2">
                    {blog.titulo}
                  </h2>

                  <p className="text-dark_grey dark:text-gray-400 mb-4 line-clamp-3">
                    {blog.contenido_preview}
                  </p>

                  {/* Keywords */}
                  {blog.palabras_clave && blog.palabras_clave.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {blog.palabras_clave.slice(0, 3).map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                        >
                          {keyword}
                        </span>
                      ))}
                      {blog.palabras_clave.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-dark_grey dark:text-gray-400 text-xs rounded-full">
                          +{blog.palabras_clave.length - 3} más
                        </span>
                      )}
                    </div>
                  )}

                  <Link
                    href={`/blog/${blog.id}`}
                    className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-semibold transition-colors"
                  >
                    Leer más
                    <Icon icon="solar:arrow-right-linear" className="w-4 h-4" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!loading && blogs.length > 0 && pagination.totalPages > 1 && (
          <div className="flex justify-center items-center gap-4 mt-12">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!pagination.hasPrev}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                pagination.hasPrev
                  ? "bg-white dark:bg-gray-800 text-midnight_text dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 shadow"
                  : "bg-gray-100 dark:bg-gray-700 text-dark_grey dark:text-gray-400 cursor-not-allowed"
              }`}
            >
              <Icon icon="solar:arrow-left-linear" className="w-4 h-4" />
              Anterior
            </button>

            <div className="flex items-center gap-2">
              {Array.from(
                { length: Math.min(5, pagination.totalPages) },
                (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-2 rounded-lg font-medium transition-colors ${
                        currentPage === pageNum
                          ? "bg-primary text-white"
                          : "bg-white dark:bg-gray-800 text-midnight_text dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 shadow"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
              )}
            </div>

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!pagination.hasNext}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                pagination.hasNext
                  ? "bg-white dark:bg-gray-800 text-midnight_text dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 shadow"
                  : "bg-gray-100 dark:bg-gray-700 text-dark_grey dark:text-gray-400 cursor-not-allowed"
              }`}
            >
              Siguiente
              <Icon icon="solar:arrow-right-linear" className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
