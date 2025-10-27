"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Form from "@/components/Form";
import type { FormFieldConfig } from "@/components/Form.types";

interface Usuario {
  id: number;
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
}

export default function EditarUsuarioPage() {
  const router = useRouter();
  const params = useParams();
  const { data: session, status } = useSession();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const usuarioId = params.id as string;

  // Proteger la ruta - solo roles 1 y 2
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    } else if (status === "authenticated") {
      const userRole = session?.user?.rolId;
      if (userRole !== 1 && userRole !== 2) {
        toast.error("No tienes permisos para acceder a esta página");
        router.push("/");
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && usuarioId) {
      fetchUsuario();
      fetchRoles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, usuarioId]);

  const fetchUsuario = async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/usuarios/${usuarioId}`);

      if (!response.ok) {
        throw new Error("Error al cargar usuario");
      }

      const data = await response.json();
      setUsuario(data.data);
    } catch (error) {
      console.error("Error fetching usuario:", error);
      toast.error("Error al cargar el usuario");
      router.push("/admin/usuarios");
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
      setRoles(data.data.filter((r: Role) => r.activo));
    } catch (error) {
      console.error("Error fetching roles:", error);
      toast.error("Error al cargar los roles");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (formData: Record<string, unknown>) => {
    try {
      setSubmitting(true);

      // Validaciones
      if (!formData.nombre || !formData.apellido || !formData.rol_id) {
        toast.error("Todos los campos son obligatorios");
        return;
      }

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/usuarios/${usuarioId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre,
          apellido: formData.apellido,
          rol_id: Number(formData.rol_id),
          activo: formData.activo === true || formData.activo === "true",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al actualizar usuario");
      }

      toast.success("Usuario actualizado exitosamente");
      router.push("/admin/usuarios");
    } catch (error) {
      console.error("Error updating usuario:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar usuario"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fields: FormFieldConfig[] = [
    {
      name: "correo",
      label: "Correo Electrónico",
      type: "text",
      required: true,
      disabled: true,
    },
    {
      name: "nombre",
      label: "Nombre",
      type: "text",
      required: true,
    },
    {
      name: "apellido",
      label: "Apellido",
      type: "text",
      required: true,
    },
    {
      name: "rol_id",
      label: "Rol",
      type: "select",
      required: true,
      options: roles.map((role) => ({
        value: role.id,
        label: role.nombre,
      })),
      disabled: usuario?.rol_id === 1 || usuario?.rol_id === 2,
    },
    {
      name: "activo",
      label: "Estado",
      type: "select",
      required: true,
      options: [
        { value: "true", label: "Activo" },
        { value: "false", label: "Inactivo" },
      ],
    },
  ];

  if (status === "loading" || loading || !usuario) {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
          <p className="mt-4 text-dark_grey dark:text-gray-400">
            Cargando...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push("/admin/usuarios")}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Icon
                icon="solar:arrow-left-linear"
                className="w-6 h-6 text-midnight_text dark:text-white"
              />
            </button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-midnight_text dark:text-white mb-2">
                Editar Usuario
              </h1>
              <p className="text-dark_grey dark:text-gray-400">
                Modifica la información del usuario {usuario.nombre}{" "}
                {usuario.apellido}
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <Form
            fields={fields}
            onSubmit={handleSubmit}
            submitLabel={submitting ? "Guardando..." : "Guardar Cambios"}
            isSubmitting={submitting}
            initialValues={{
              correo: usuario.correo,
              nombre: usuario.nombre,
              apellido: usuario.apellido,
              rol_id: usuario.rol_id,
              activo: usuario.activo.toString(),
            }}
          />
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => router.push("/admin/usuarios")}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-midnight_text dark:text-white"
              disabled={submitting}
            >
              Cancelar
            </button>
          </div>
        </div>

        {/* Información del correo */}
        {usuario.rol_id !== 1 && usuario.rol_id !== 2 && (
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icon
                icon="solar:info-circle-linear"
                className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
              />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <p className="font-semibold mb-1">Nota sobre el correo electrónico</p>
                <p>
                  El correo electrónico no puede ser modificado ya que está vinculado
                  con la autenticación de Azure AD.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Información del usuario */}
        <div className="mt-6 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-midnight_text dark:text-white mb-3">
            Información del Usuario
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-dark_grey dark:text-gray-400">
                Fecha de creación:
              </span>
              <span className="ml-2 text-midnight_text dark:text-white">
                {new Date(usuario.fecha_creacion).toLocaleString("es-PA")}
              </span>
            </div>
            <div>
              <span className="text-dark_grey dark:text-gray-400">
                Último acceso:
              </span>
              <span className="ml-2 text-midnight_text dark:text-white">
                {usuario.ultimo_login
                  ? new Date(usuario.ultimo_login).toLocaleString("es-PA")
                  : "Nunca"}
              </span>
            </div>
          </div>
        </div>

        {/* Advertencia para administradores */}
        {(usuario.rol_id === 1 || usuario.rol_id === 2) && (
          <div className="mt-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Icon
                icon="solar:danger-triangle-linear"
                className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
              />
              <div className="text-sm text-red-700 dark:text-red-300">
                <p className="font-semibold mb-1">Cuenta de Administrador</p>
                <p>
                  Este usuario tiene privilegios de administrador. No se puede
                  modificar su rol por seguridad.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
