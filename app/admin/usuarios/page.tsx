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
  const [editingUsuario, setEditingUsuario] = useState<Usuario | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRol, setSelectedRol] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  // Proteger la ruta - solo roles 1 y 2
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      const userRole = session?.user?.rolId;
      if (userRole !== 1 && userRole !== 2) {
        toast.error("No tienes permisos para acceder a esta página");
        router.push("/dashboard");
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
    setEditingUsuario(usuario);
    setSelectedRol(usuario.rol_id);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUsuario) return;

    // No permitir cambiar role si es admin
    if (editingUsuario.rol_id === 1 || editingUsuario.rol_id === 2) {
      toast.error("No se puede cambiar el rol de un administrador");
      return;
    }

    try {
      setSubmitting(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(
        `${basePath}/api/admin/usuarios/${editingUsuario.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rol: selectedRol,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar usuario");
      }

      toast.success("Usuario actualizado exitosamente");
      setShowEditModal(false);
      fetchUsuarios();
    } catch (error) {
      console.error("Error saving usuario:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar usuario"
      );
    } finally {
      setSubmitting(false);
    }
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
          {row.original.rol_id !== 1 && row.original.rol_id !== 2 ? (
            <button
              onClick={() => handleEditUsuario(row.original)}
              className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
              title="Cambiar rol"
            >
              <Icon icon="solar:pen-linear" className="w-5 h-5" />
            </button>
          ) : (
            <div className="px-2 py-2 text-xs text-gray-400">Administrador</div>
          )}
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

        {/* Modal para cambiar rol */}
        {showEditModal && editingUsuario && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-midnight_text dark:text-white">
                    Cambiar Rol
                  </h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Icon
                      icon="solar:close-circle-linear"
                      className="w-6 h-6"
                    />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <p className="text-sm font-medium text-midnight_text dark:text-white mb-2">
                    Usuario
                  </p>
                  <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-midnight_text dark:text-white">
                    {editingUsuario.nombre} {editingUsuario.apellido}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-midnight_text dark:text-white mb-2">
                    Nuevo Rol
                  </label>
                  <select
                    value={selectedRol}
                    onChange={(e) => setSelectedRol(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-midnight_text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value={0}>Selecciona un rol</option>
                    {roles
                      .filter((r) => r.id !== 1 && r.id !== 2)
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.nombre}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Rol actual:</strong>{" "}
                    {getRoleNombre(editingUsuario.rol_id)}
                  </p>
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-midnight_text dark:text-white"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={submitting || selectedRol === 0}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
