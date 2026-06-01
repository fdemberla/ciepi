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
      if (
        !formData.correo ||
        !formData.nombre ||
        !formData.apellido ||
        !formData.rol_id
      ) {
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
        error instanceof Error ? error.message : "Error al crear usuario",
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
              Crear Nuevo
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
                Crear Nuevo Usuario
              </h1>
              <p className="text-xs text-dark_grey dark:text-gray-400 mt-0.5">
                Agrega un nuevo usuario administrador al sistema
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Form
            fields={fields}
            onSubmit={handleSubmit}
            submitLabel={submitting ? "Creando..." : "Crear Usuario"}
            isSubmitting={submitting}
            initialValues={{ activo: "true" }}
          />

          {/* Información adicional */}
          <div className="mt-4 bg-primary/5 dark:bg-primary/10 border border-primary/20 dark:border-primary/30 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Icon
                icon="solar:info-circle-linear"
                className="w-5 h-5 text-primary flex-shrink-0 mt-0.5"
              />
              <div className="text-sm">
                <p className="font-semibold text-midnight_text dark:text-white mb-1">
                  Información importante:
                </p>
                <ul className="list-disc list-inside space-y-1 text-dark_grey dark:text-gray-400">
                  <li>El correo electrónico debe ser único en el sistema</li>
                  <li>
                    El usuario podrá iniciar sesión con su cuenta de Azure AD
                  </li>
                  <li>Los permisos del usuario dependerán del rol asignado</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
