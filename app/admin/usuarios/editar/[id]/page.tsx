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
      const response = await fetch(
        `${basePath}/api/admin/usuarios/${usuarioId}`,
      );

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
      const response = await fetch(
        `${basePath}/api/admin/usuarios/${usuarioId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre: formData.nombre,
            apellido: formData.apellido,
            rol_id: Number(formData.rol_id),
            activo: formData.activo === true || formData.activo === "true",
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al actualizar usuario");
      }

      toast.success("Usuario actualizado exitosamente");
      router.push("/admin/usuarios");
    } catch (error) {
      console.error("Error updating usuario:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al actualizar usuario",
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
          <p className="mt-4 text-dark_grey dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 py-4">
          <div className="flex items-center gap-1.5 text-xs text-dark_grey dark:text-gray-400 mb-3">
            <button
              onClick={() => router.push("/admin/usuarios")}
              className="hover:text-primary transition-colors"
            >
              Usuarios
            </button>
            <Icon icon="solar:alt-arrow-right-linear" className="w-3 h-3" />
            <span className="text-midnight_text dark:text-white font-medium">
              Editar
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/usuarios")}
              className="group flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all duration-200"
              aria-label="Volver a Usuarios"
            >
              <Icon
                icon="solar:alt-arrow-left-linear"
                className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform"
              />
            </button>
            <div>
              <h1 className="text-xl font-bold text-midnight_text dark:text-white">
                {usuario.nombre} {usuario.apellido}
              </h1>
              <p className="text-xs text-dark_grey dark:text-gray-400 mt-0.5">
                Modifica la información del usuario
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 py-8">
        <div className="max-w-4xl mx-auto">
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

          {/* Información del correo */}
          {usuario.rol_id !== 1 && usuario.rol_id !== 2 && (
            <div className="mt-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Icon
                  icon="solar:info-circle-linear"
                  className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
                />
                <div className="text-sm">
                  <p className="font-semibold text-midnight_text dark:text-white mb-1">
                    Nota sobre el correo electrónico
                  </p>
                  <p className="text-dark_grey dark:text-gray-400">
                    El correo electrónico no puede ser modificado ya que está
                    vinculado con la autenticación de Azure AD.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Información del usuario */}
          <div className="mt-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-midnight_text dark:text-white mb-3 flex items-center gap-2">
              <Icon
                icon="solar:user-id-linear"
                className="w-4 h-4 text-dark_grey"
              />
              Información del Usuario
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-dark_grey dark:text-gray-400 uppercase tracking-wide">
                  Fecha de creación
                </span>
                <span className="text-midnight_text dark:text-white font-medium">
                  {new Date(usuario.fecha_creacion).toLocaleString("es-PA")}
                </span>
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs text-dark_grey dark:text-gray-400 uppercase tracking-wide">
                  Último acceso
                </span>
                <span className="text-midnight_text dark:text-white font-medium">
                  {usuario.ultimo_login
                    ? new Date(usuario.ultimo_login).toLocaleString("es-PA")
                    : "Nunca"}
                </span>
              </div>
            </div>
          </div>

          {/* Advertencia para administradores */}
          {(usuario.rol_id === 1 || usuario.rol_id === 2) && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Icon
                  icon="solar:danger-triangle-linear"
                  className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5"
                />
                <div className="text-sm">
                  <p className="font-semibold text-red-700 dark:text-red-300 mb-1">
                    Cuenta de Administrador
                  </p>
                  <p className="text-red-600 dark:text-red-400">
                    Este usuario tiene privilegios de administrador. No se puede
                    modificar su rol por seguridad.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
