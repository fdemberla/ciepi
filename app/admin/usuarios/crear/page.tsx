"use client";
import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Form from "@/components/Form";
import type { FormFieldConfig } from "@/components/Form.types";

interface Role {
  id: number;
  nombre: string;
  activo: boolean;
}

export default function CrearUsuarioPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Proteger la ruta - solo roles 1 y 2
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/admin/login");
    } else if (status === "authenticated") {
      const userRole = session?.user?.rolId;
      if (userRole !== 1 && userRole !== 2) {
        toast.error("No tienes permisos para acceder a esta página");
        router.push("/");
      } else {
        fetchRoles();
      }
    }
  }, [status, session, router]);

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
      if (!formData.correo || !formData.nombre || !formData.apellido || !formData.rol_id) {
        toast.error("Todos los campos son obligatorios");
        return;
      }

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: formData.correo,
          nombre: formData.nombre,
          apellido: formData.apellido,
          rol_id: Number(formData.rol_id),
          activo: formData.activo === true || formData.activo === "true",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al crear usuario");
      }

      toast.success("Usuario creado exitosamente");
      router.push("/admin/usuarios");
    } catch (error) {
      console.error("Error creating usuario:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al crear usuario"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fields: FormFieldConfig[] = [
    {
      name: "correo",
      label: "Correo Electrónico",
      type: "email",
      required: true,
      regex: "^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$",
      errorMessage: "Ingrese un correo electrónico válido",
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

  if (status === "loading" || loading) {
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
                Crear Nuevo Usuario
              </h1>
              <p className="text-dark_grey dark:text-gray-400">
                Agrega un nuevo usuario administrador al sistema
              </p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <Form
            fields={fields}
            onSubmit={handleSubmit}
            submitLabel={submitting ? "Creando..." : "Crear Usuario"}
            isSubmitting={submitting}
            initialValues={{ activo: "true" }}
          />
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => router.push("/admin/usuarios")}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-midnight_text dark:text-white"
              disabled={submitting}
            >
              Cancelar
            </button>
          </div>
        </div>

        {/* Información adicional */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Icon
              icon="solar:info-circle-linear"
              className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
            />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-semibold mb-1">Información importante:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>El correo electrónico debe ser único en el sistema</li>
                <li>El usuario podrá iniciar sesión con su cuenta de Azure AD</li>
                <li>Los permisos del usuario dependerán del rol asignado</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
