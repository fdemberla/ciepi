"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import Form from "@/components/Form";
import type { FormFieldConfig } from "@/components/Form.types";

const CrearEventoPage = () => {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formFields: FormFieldConfig[] = [
    {
      name: "nombre",
      label: "Nombre del Evento",
      type: "text",
      required: true,
      errorMessage: "El nombre del evento es obligatorio",
    },
    {
      name: "ubicacion",
      label: "Ubicación",
      type: "text",
    },
    {
      name: "fecha_inicio",
      label: "Fecha de Inicio",
      type: "datetime-local",
      required: true,
      errorMessage: "La fecha de inicio es obligatoria",
      row: 1,
    },
    {
      name: "fecha_fin",
      label: "Fecha de Fin",
      type: "datetime-local",
      required: true,
      errorMessage: "La fecha de fin es obligatoria",
      row: 1,
    },
    {
      name: "descripcion",
      label: "Descripción",
      type: "textarea",
    },
    {
      name: "banner",
      label: "Banner del Evento",
      type: "file",
      accept: "image/*",
      dropzoneText:
        "Clic para cargar imagen o arrastra y suelta (PNG, JPG hasta 5MB)",
    },
  ];

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      setIsSubmitting(true);

      const submitFormData = new FormData();
      submitFormData.append("nombre", data.nombre as string);
      submitFormData.append("descripcion", (data.descripcion as string) || "");
      submitFormData.append("fecha_inicio", data.fecha_inicio as string);
      submitFormData.append("fecha_fin", data.fecha_fin as string);
      submitFormData.append("ubicacion", (data.ubicacion as string) || "");

      // Handle banner file upload
      if (data.banner && Array.isArray(data.banner) && data.banner.length > 0) {
        submitFormData.append("banner", data.banner[0]);
      }

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/eventos`, {
        method: "POST",
        body: submitFormData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Error al crear evento",
        );
      }

      router.push("/admin/eventos");
    } catch (err) {
      console.error("Error creating evento:", err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slateGray dark:bg-gray-900">
      {/* Page Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 py-4">
          <div className="flex items-center gap-1.5 text-xs text-dark_grey dark:text-gray-400 mb-3">
            <button
              onClick={() => router.push("/admin/eventos")}
              className="hover:text-primary transition-colors"
            >
              Eventos
            </button>
            <Icon icon="solar:alt-arrow-right-linear" className="w-3 h-3" />
            <span className="text-midnight_text dark:text-white font-medium">
              Crear Nuevo
            </span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin/eventos")}
              className="group flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all duration-200"
              aria-label="Volver a Eventos"
            >
              <Icon
                icon="solar:alt-arrow-left-linear"
                className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform"
              />
            </button>
            <div>
              <h1 className="text-xl font-bold text-midnight_text dark:text-white">
                Crear Nuevo Evento
              </h1>
              <p className="text-xs text-dark_grey dark:text-gray-400 mt-0.5">
                Complete los campos requeridos y guarde el evento
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Form
            fields={formFields}
            onSubmit={handleSubmit}
            submitLabel="Crear Evento"
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default CrearEventoPage;
