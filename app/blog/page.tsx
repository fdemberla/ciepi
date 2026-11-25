"use client";
import React, { useState, useEffect, useCallback } from "react";
import { Icon } from "@iconify/react";
import NewsCard from "@/components/brand/NewsCard";

interface Blog {
  id: string;
  titulo: string;
  imagen_banner: string | null;
  palabras_clave: string[];
  creado_en: string;
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

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-b from-primary/8 via-primary/3 to-transparent pt-32 pb-12">
        <div className="max-w-7xl mx-auto px-4 text-center animate-fade-up">
          <span className="block h-1.5 w-12 bg-brand-green rounded-full mx-auto mb-3"></span>
          <h1 className="text-4xl md:text-5xl font-bold text-primary dark:text-white mb-3">
            Actualidad CIEPI
          </h1>
          <p className="text-lg text-dark_grey dark:text-gray-400 max-w-2xl mx-auto">
            Noticias, actividades y artículos del Centro de Innovación y
            Emprendimiento Productivo del INADEH.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-100 dark:border-gray-700 p-5 mb-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Icon
                icon="solar:magnifer-linear"
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark_grey dark:text-gray-400 w-4 h-4"
              />
              <input
                type="text"
                placeholder="Buscar por título o palabras clave..."
                value={searchTerm}
                onChange={handleSearch}
                className="w-full h-11 pl-9 pr-9 text-sm border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-midnight_text dark:text-white placeholder:text-dark_grey dark:placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-dark_grey dark:text-gray-400 hover:text-midnight_text dark:hover:text-white"
                >
                  <Icon
                    icon="solar:close-circle-bold"
                    className="w-4 h-4"
                    aria-hidden="true"
                  />
                </button>
              )}
            </div>

            {/* Sort Options */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-midnight_text dark:text-white">
                Ordenar por:
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleSortChange("fecha_creacion")}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    sortBy === "fecha_creacion"
                      ? "bg-primary text-white shadow-md"
                      : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-midnight_text dark:text-white hover:border-primary/40 hover:text-primary"
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                    sortBy === "titulo"
                      ? "bg-primary text-white shadow-md"
                      : "bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-midnight_text dark:text-white hover:border-primary/40 hover:text-primary"
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
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {blogs.map((blog, index) => (
              <div
                key={blog.id}
                className="animate-fade-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <NewsCard {...blog} />
              </div>
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
                },
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
