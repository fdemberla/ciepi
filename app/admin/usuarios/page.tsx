"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Table from "@/components/Table";
import type { ColumnDef } from "@tanstack/react-table";

interface Usuario {
  id: string;
  correo: string;
  nombre: string;
  apellido: string;
  activo: boolean;
  rol_id: number;
  fecha_creacion: string;
  ultimo_login: string | null;
}

interface Role {
  id: number;
  nombre: string;
  activo: boolean;
  fecha_creacion: string;
}

export default function UsuariosAdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  // Proteger la ruta - solo roles 1 y 2
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const userRole = session?.user?.rolId;
      if (userRole !== 1 && userRole !== 2) {
        toast.error("No tienes permisos para acceder a esta página");
        router.push("/");
      }
    }
  }, [status, session, router]);

  // Cargar usuarios y roles
  useEffect(() => {
    if (status === "authenticated") {
      fetchUsuarios();
      fetchRoles();
    }
  }, [status]);

  const fetchUsuarios = async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/usuarios`);

      if (!response.ok) {
        throw new Error("Error al cargar usuarios");
      }

      const data = await response.json();
      setUsuarios(data.data);
    } catch (error) {
      console.error("Error fetching usuarios:", error);
      toast.error("Error al cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/roles`);

      if (!response.ok) {
        throw new Error("Error al cargar roles");
      }

      const data = await response.json();
      setRoles(data.data);
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Error al cargar los roles");
    }
  };

  const getRoleNombre = (rolId: number) => {
    const role = roles.find((r) => r.id === rolId);
    return role?.nombre || "Desconocido";
  };

  const handleEditUsuario = (usuario: Usuario) => {
    router.push(`/admin/usuarios/editar/${usuario.id}`);
  };

  const getRolColor = (rolId: number) => {
    const colors: { [key: number]: string } = {
      1: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      2: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      3: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      4: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    };
    return (
      colors[rolId] ||
      "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
    );
  };

  const columns: ColumnDef<Usuario>[] = [
    {
      accessorKey: "nombre",
      header: "Nombre",
      cell: ({ row }) => (
        <div>
          <div className="font-medium text-midnight_text dark:text-white">
            {row.original.nombre} {row.original.apellido}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {row.original.correo}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "rol_id",
      header: "Rol",
      cell: ({ row }) => (
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${getRolColor(
            row.original.rol_id
          )}`}
        >
          {getRoleNombre(row.original.rol_id)}
        </span>
      ),
    },
    {
      accessorKey: "activo",
      header: "Estado",
      cell: ({ row }) => (
        <span
          className={`px-2 py-1 rounded text-xs font-semibold ${
            row.original.activo
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
          }`}
        >
          {row.original.activo ? "Activo" : "Inactivo"}
        </span>
      ),
    },
    {
      accessorKey: "fecha_creacion",
      header: "Creado",
      cell: ({ row }) => (
        <span className="text-sm">
          {new Date(row.original.fecha_creacion).toLocaleDateString("es-PA")}
        </span>
      ),
    },
    {
      accessorKey: "ultimo_login",
      header: "Último Acceso",
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.ultimo_login
            ? new Date(row.original.ultimo_login).toLocaleDateString("es-PA")
            : "Nunca"}
        </span>
      ),
    },
    {
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEditUsuario(row.original)}
            className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
            title="Editar usuario"
          >
            <Icon icon="solar:pen-linear" className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
          <p className="mt-4 text-dark_grey dark:text-gray-400">
            Cargando usuarios...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push("/admin/roles")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Icon
                icon="solar:arrow-left-linear"
                className="w-6 h-6 text-midnight_text dark:text-white"
              />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-midnight_text dark:text-white mb-2">
                Gestión de Usuarios
              </h1>
              <p className="text-dark_grey dark:text-gray-400">
                Administra usuarios del sistema y asigna roles
              </p>
            </div>
            <button
              onClick={() => router.push("/admin/usuarios/crear")}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full hover:bg-primary/90 transition-all duration-300 shadow-lg hover:shadow-xl"
            >
              <Icon icon="solar:user-plus-linear" className="w-5 h-5" />
              <span>Crear Usuario</span>
            </button>
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
            <p className="mt-4 text-dark_grey dark:text-gray-400">
              Cargando usuarios...
            </p>
          </div>
        ) : (
          <Table
            data={usuarios}
            columns={columns}
            enableSorting
            enablePagination
            searchPlaceholder="Buscar por nombre o correo..."
          />
        )}
      </div>
    </div>
  );
}
