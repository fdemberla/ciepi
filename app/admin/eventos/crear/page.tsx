"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
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
          errorData.message || errorData.error || "Error al crear evento"
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
    <Form
      fields={formFields}
      onSubmit={handleSubmit}
      title="Crear Nuevo Evento"
      submitLabel="Crear Evento"
      isSubmitting={isSubmitting}
    />
  );
};

export default CrearEventoPage;
