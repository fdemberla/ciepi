"use client";
import React, { useState } from "react";
import type { FormFieldOrSection } from "@/components/Form.types";
import Form from "@/components/Form";
import toast from "react-hot-toast";
import AdminProtection from "@/components/AdminProtection";
import ProfesoresSelector from "@/components/ProfesoresSelector";
import UbicacionHorariosSelector, {
  type UbicacionSelection,
} from "@/components/UbicacionHorariosSelector";
import { Icon } from "@iconify/react";
import { withBasePath } from "@/lib/basePath";
import {
  CAPACITACION_LOGISTICA_SECTION,
  type HorarioInput,
} from "@/lib/capacitacionDetails";

const fields: FormFieldOrSection[] = [
  {
    name: "info",
    label: "Información de la capacitación",
    type: "section",
    className: "text-blue-700",
    fields: [
      {
        name: "Banner",
        label: "Banner de la capacitación",
        type: "file",
        required: false,
        multiple: false,
        dropzoneText:
          "Arrastra una imagen aquí o haz clic para seleccionar (jpg, jpeg, png, webp)",
        accept: ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp",
      },
      {
        name: "nombre",
        label: "Nombre de Capacitación",
        type: "text",
        required: true,
        errorMessage: "El nombre es obligatorio",
      },
      {
        name: "descripcion",
        label: "Descripción",
        type: "textarea-slate",
        required: false,
      },
      {
        name: "cantidadHoras",
        label: "Cantidad de horas",
        type: "number",
        required: true,
      },
      {
        name: "cantidad_participantes",
        label: "Cantidad de participantes",
        type: "number",
        required: true,
      },
      {
        name: "archivoAdjunto",
        label: "Adjuntar archivos",
        type: "file",
        required: false,
        multiple: true,
        dropzoneText:
          "Arrastra documentos aquí o haz clic para seleccionar (pdf, docx, xlsx, etc.)",
        accept:
          ".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
    ],
  },
  {
    name: "inscripcion",
    label: "Fechas de Inscripción",
    type: "section",
    className: "text-green-700",
    fields: [
      {
        name: "fechaInicioInscripcion",
        label: "Inicio de Inscripción",
        type: "date",
        required: true,
        row: 1,
      },
      {
        name: "fechaFinalInscripcion",
        label: "Fin de Inscripción",
        type: "date",
        required: true,
        row: 1,
      },
    ],
  },
  {
    name: "capacitacion",
    label: "Fechas de Capacitación",
    type: "section",
    className: "text-purple-700",
    fields: [
      {
        name: "fechaInicioCapacitacion",
        label: "Inicio de Capacitación",
        type: "date",
        required: true,
        row: 2,
      },
      {
        name: "fechaFinalCapacitacion",
        label: "Fin de Capacitación",
        type: "date",
        required: true,
        row: 2,
      },
    ],
  },
  CAPACITACION_LOGISTICA_SECTION,
];

const Page = () => {
  const [selectedProfesorIds, setSelectedProfesorIds] = useState<number[]>([]);
  const [ubicacion, setUbicacion] = useState<UbicacionSelection>({
    sedeId: null,
    edificioId: null,
    aulaId: null,
  });
  const [horarios, setHorarios] = useState<HorarioInput[]>([]);

  const handleSubmit = async (data: Record<string, unknown>) => {
    try {
      // Create FormData to send files and data
      const formData = new FormData();

      // Process each field
      Object.keys(data).forEach((key) => {
        if (Array.isArray(data[key]) && data[key][0] instanceof File) {
          // Handle file fields
          const files = data[key] as File[];
          files.forEach((file) => {
            formData.append(key, file);
          });
        } else {
          // Handle non-file fields
          const value = data[key];
          if (value !== null && value !== undefined) {
            // If it's an object (like Slate editor content), stringify it
            if (typeof value === "object") {
              formData.append(key, JSON.stringify(value));
            } else {
              formData.append(key, String(value));
            }
          }
        }
      });
      formData.append("profesorIds", JSON.stringify(selectedProfesorIds));
      if (ubicacion.sedeId) formData.append("sedeId", String(ubicacion.sedeId));
      if (ubicacion.edificioId) formData.append("edificioId", String(ubicacion.edificioId));
      if (ubicacion.aulaId) formData.append("aulaId", String(ubicacion.aulaId));
      formData.append("horarios", JSON.stringify(horarios));

      // Send POST request to the API
      const response = await fetch(
        withBasePath("/api/admin/capacitaciones/crear"),
        {
          method: "POST",
          body: formData,
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al crear la capacitación");
      }

      // Show success message
      toast.success("Capacitación creada exitosamente");

      // Redirect to capacitaciones list
      setTimeout(() => {
        window.location.href = withBasePath("/admin/capacitaciones");
      }, 1000);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al crear la capacitación",
      );
    }
  };

  return (
    <AdminProtection>
      <div className="min-h-screen bg-slateGray dark:bg-gray-900">
        {/* Page Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 py-4">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-dark_grey dark:text-gray-400 mb-3">
              <a
                href={withBasePath("/admin/capacitaciones")}
                className="hover:text-primary transition-colors"
              >
                Capacitaciones
              </a>
              <Icon icon="solar:alt-arrow-right-linear" className="w-3 h-3" />
              <span className="text-midnight_text dark:text-white font-medium">
                Crear Nueva
              </span>
            </div>

            {/* Header row */}
            <div className="flex items-center gap-4">
              <a
                href={withBasePath("/admin/capacitaciones")}
                className="group flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all duration-200"
                aria-label="Volver a Capacitaciones"
              >
                <Icon
                  icon="solar:alt-arrow-left-linear"
                  className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform"
                />
              </a>
              <div>
                <h1 className="text-xl font-bold text-midnight_text dark:text-white">
                  Crear Nueva Capacitación
                </h1>
                <p className="text-xs text-dark_grey dark:text-gray-400 mt-0.5">
                  Complete los campos requeridos y guarde la capacitación
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content — 80% width on desktop */}
        <div className="w-full lg:w-[80%] mx-auto px-4 py-8">
          <Form
              title={"Crear Nueva Capacitación"}
              fields={fields}
              onSubmit={handleSubmit}
              submitLabel="Guardar"
            >
              <UbicacionHorariosSelector
                ubicacion={ubicacion}
                onUbicacionChange={setUbicacion}
                horarios={horarios}
                onHorariosChange={setHorarios}
              />
              <ProfesoresSelector
                selectedIds={selectedProfesorIds}
                onChange={setSelectedProfesorIds}
              />
            </Form>
        </div>
      </div>
    </AdminProtection>
  );
};

export default Page;
