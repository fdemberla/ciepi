"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";

interface Role {
  id: number;
  nombre: string;
  activo: boolean;
  fecha_creacion: string;
}

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

export default function RolesPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [roles, setRoles] = useState<Role[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [editedName, setEditedName] = useState("");
  const [editedActive, setEditedActive] = useState(true);
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

  // Cargar roles y usuarios
  useEffect(() => {
    if (status === "authenticated") {
      fetchRoles();
      fetchUsuarios();
    }
  }, [status]);

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
    } finally {
      setLoading(false);
    }
  };

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
      // No mostrar error si el endpoint no existe, es opcional para ahora
    }
  };

  const handleEditRole = (role: Role) => {
    setEditingRole(role);
    setEditedName(role.nombre);
    setEditedActive(role.activo);
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editedName.trim()) {
      toast.error("El nombre del rol no puede estar vacío");
      return;
    }

    try {
      setSubmitting(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/roles`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRole?.id,
          nombre: editedName,
          activo: editedActive,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al actualizar rol");
      }

      toast.success("Rol actualizado exitosamente");
      setShowEditModal(false);
      fetchRoles();
    } catch (error) {
      console.error("Error saving role:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar rol"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRoleName.trim()) {
      toast.error("El nombre del rol no puede estar vacío");
      return;
    }

    try {
      setSubmitting(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/roles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: newRoleName,
          activo: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al crear rol");
      }

      toast.success("Rol creado exitosamente");
      setShowCreateModal(false);
      setNewRoleName("");
      fetchRoles();
    } catch (error) {
      console.error("Error creating role:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al crear rol"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const getUsuariosPorRol = (rolId: number) => {
    return usuarios.filter((u) => u.rol_id === rolId).length;
  };

  const getRoleColor = (roleId: number) => {
    const colors: { [key: number]: string } = {
      1: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
      2: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
      3: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
      4: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
    };
    return colors[roleId] || "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
  };

  const getRoleDescription = (roleId: number) => {
    const descriptions: { [key: number]: string } = {
      1: "Administrador Principal - Acceso total al sistema",
      2: "Super Administrador - Acceso total al sistema",
      3: "CIEPI - Puede crear y editar blogs propios",
      4: "Relaciones Públicas - Puede aprobar cambios de estado",
    };
    return descriptions[roleId] || "Sin descripción";
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
          <p className="mt-4 text-dark_grey dark:text-gray-400">
            Cargando roles...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-8">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-midnight_text dark:text-white mb-2">
              Administración de Roles
            </h1>
            <p className="text-dark_grey dark:text-gray-400">
              Gestiona los roles del sistema y asigna permisos a los usuarios
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/admin/usuarios")}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-midnight_text dark:text-white"
            >
              <Icon icon="solar:users-group-rounded-linear" className="w-5 h-5" />
              Gestionar Usuarios
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
            >
              <Icon icon="solar:add-circle-linear" className="w-5 h-5" />
              Nuevo Rol
            </button>
          </div>
        </div>

        {/* Grid de Roles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
            >
              {/* Encabezado */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3 ${getRoleColor(
                      role.id
                    )}`}
                  >
                    ID: {role.id}
                  </span>
                  <h2 className="text-xl font-bold text-midnight_text dark:text-white mb-1">
                    {role.nombre}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getRoleDescription(role.id)}
                  </p>
                </div>
              </div>

              {/* Información */}
              <div className="space-y-3 mb-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Estado
                  </span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      role.activo
                        ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                        : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                    }`}
                  >
                    {role.activo ? "Activo" : "Inactivo"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Usuarios
                  </span>
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded text-xs font-semibold">
                    {getUsuariosPorRol(role.id)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Creado
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(role.fecha_creacion).toLocaleDateString("es-PA")}
                  </span>
                </div>
              </div>

              {/* Acciones */}
              {(role.id !== 1 && role.id !== 2) && (
                <button
                  onClick={() => handleEditRole(role)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-primary text-primary hover:bg-primary hover:text-white rounded-lg transition-colors"
                >
                  <Icon icon="solar:pen-linear" className="w-4 h-4" />
                  Editar
                </button>
              )}
              {(role.id === 1 || role.id === 2) && (
                <div className="w-full px-4 py-2 text-center text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  Rol del sistema - No editable
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sección de Usuarios por Rol */}
        {usuarios.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-midnight_text dark:text-white mb-6">
              Usuarios por Rol
            </h2>
            <div className="space-y-4">
              {roles.map((role) => {
                const usuariosDelRol = usuarios.filter(
                  (u) => u.rol_id === role.id
                );
                if (usuariosDelRol.length === 0) return null;

                return (
                  <div key={role.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h3 className="font-semibold text-midnight_text dark:text-white mb-3">
                      {role.nombre} ({usuariosDelRol.length})
                    </h3>
                    <div className="space-y-2">
                      {usuariosDelRol.map((usuario) => (
                        <div
                          key={usuario.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded"
                        >
                          <div>
                            <p className="text-sm font-medium text-midnight_text dark:text-white">
                              {usuario.nombre} {usuario.apellido}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {usuario.correo}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {usuario.activo ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded text-xs">
                                <Icon
                                  icon="solar:check-circle-linear"
                                  className="w-3 h-3"
                                />
                                Activo
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded text-xs">
                                <Icon
                                  icon="solar:close-circle-linear"
                                  className="w-3 h-3"
                                />
                                Inactivo
                              </span>
                            )}
                            {usuario.ultimo_login && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                Último acceso:{" "}
                                {new Date(usuario.ultimo_login).toLocaleDateString(
                                  "es-PA"
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal para editar rol */}
        {showEditModal && editingRole && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-midnight_text dark:text-white">
                    Editar Rol
                  </h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Icon icon="solar:close-circle-linear" className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-midnight_text dark:text-white mb-2">
                    Nombre del Rol
                  </label>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-midnight_text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="active"
                    checked={editedActive}
                    onChange={(e) => setEditedActive(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <label
                    htmlFor="active"
                    className="text-sm font-medium text-midnight_text dark:text-white"
                  >
                    Activo
                  </label>
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
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para crear rol */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-midnight_text dark:text-white">
                    Nuevo Rol
                  </h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <Icon icon="solar:close-circle-linear" className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-midnight_text dark:text-white mb-2">
                    Nombre del Rol
                  </label>
                  <input
                    type="text"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    placeholder="Ej: Supervisor"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-midnight_text dark:text-white focus:outline-none focus:ring-2 focus:ring-primary placeholder-gray-400 dark:placeholder-gray-500"
                  />
                </div>
              </div>

              <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-midnight_text dark:text-white"
                  disabled={submitting}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateRole}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Creando..." : "Crear"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
