"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Icon } from "@iconify/react";
import type { FormFieldOrSection } from "@/components/Form.types";
import Form from "@/components/Form";
import toast from "react-hot-toast";
import AdminProtection from "@/components/AdminProtection";
import ProfesoresSelector from "@/components/ProfesoresSelector";
import UbicacionHorariosSelector, {
  type UbicacionSelection,
} from "@/components/UbicacionHorariosSelector";
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
  {
    name: "estado",
    label: "Estado de la Capacitación",
    type: "section",
    className: "text-orange-700",
    fields: [
      {
        name: "activo",
        label: "Estado",
        type: "select",
        required: true,
        options: [
          { value: "true", label: "Activa" },
          { value: "false", label: "Inactiva" },
        ],
      },
    ],
  },
];

const EditarCapacitacionPage = () => {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfesorIds, setSelectedProfesorIds] = useState<number[]>([]);
  const [ubicacion, setUbicacion] = useState<UbicacionSelection>({
    sedeId: null,
    edificioId: null,
    aulaId: null,
  });
  const [horarios, setHorarios] = useState<HorarioInput[]>([]);
  const [initialData, setInitialData] = useState<Record<
    string,
    unknown
  > | null>(null);

  useEffect(() => {
    const fetchCapacitacion = async () => {
      try {
        console.log(`Fetching capacitacion ${id}...`);
        const response = await fetch(withBasePath(`/api/capacitaciones/${id}`));
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Error al cargar capacitación");
        }

        const data = result.data;
        console.log("Capacitacion loaded:", data);

        // Format dates for date inputs (YYYY-MM-DD)
        const formatDateForInput = (dateString: string) => {
          if (!dateString) return "";
          return dateString.split("T")[0];
        };

        // Prepare initial data for the form
        const formData: Record<string, unknown> = {
          nombre: data.nombre || "",
          descripcion: data.descripcion || null,
          cantidadHoras: data.cantidad_horas || "",
          cantidad_participantes: data.cantidad_participantes || "",
          fechaInicioInscripcion: formatDateForInput(
            data.fecha_inicio_inscripcion,
          ),
          fechaFinalInscripcion: formatDateForInput(
            data.fecha_final_inscripcion,
          ),
          fechaInicioCapacitacion: formatDateForInput(
            data.fecha_inicio_capacitacion,
          ),
          fechaFinalCapacitacion: formatDateForInput(
            data.fecha_final_capacitacion,
          ),
          modalidad: data.modalidad || "",
          activo: String(data.activo),
          // Note: Files (Banner, archivoAdjunto) are not pre-loaded
          // Users need to upload new files if they want to change them
        };

        if (Array.isArray(data.profesores)) {
          setSelectedProfesorIds(
            data.profesores.map((p: { id: number }) => p.id),
          );
        }
        setUbicacion({
          sedeId: data.sede_id ?? null,
          edificioId: data.edificio_id ?? null,
          aulaId: data.aula_id ?? null,
        });
        if (Array.isArray(data.horarios)) {
          setHorarios(data.horarios);
        }

        setInitialData(formData);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching capacitacion:", err);
        setError(
          err instanceof Error ? err.message : "Error al cargar capacitación",
        );
        setLoading(false);
      }
    };

    if (id) {
      fetchCapacitacion();
    }
  }, [id]);

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

      // Send PUT request to the API
      const response = await fetch(
        withBasePath(`/api/admin/capacitaciones/${id}`),
        {
          method: "PUT",
          body: formData,
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Error al actualizar la capacitación");
      }

      // Show success message
      toast.success("Capacitación actualizada exitosamente");

      // Redirect to capacitaciones list
      setTimeout(() => {
        router.push("/admin/capacitaciones");
      }, 1000);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Error al actualizar la capacitación",
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
          <p className="mt-4 text-dark_grey dark:text-gray-400">
            Cargando capacitación...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 max-w-md mx-4">
          <Icon
            icon="solar:danger-circle-linear"
            className="w-12 h-12 text-red-500 mx-auto mb-4"
          />
          <p className="text-midnight_text dark:text-white text-lg font-medium mb-2">
            Error al cargar
          </p>
          <p className="text-dark_grey dark:text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push("/admin/capacitaciones")}
            className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-medium"
          >
            Volver a Capacitaciones
          </button>
        </div>
      </div>
    );
  }

  if (!initialData) {
    return null;
  }

  return (
    <AdminProtection>
      <div className="min-h-screen bg-slateGray dark:bg-gray-900">
        {/* Page Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 py-4">
            <div className="flex items-center gap-1.5 text-xs text-dark_grey dark:text-gray-400 mb-3">
              <a
                href={withBasePath("/admin/capacitaciones")}
                className="hover:text-primary transition-colors"
              >
                Capacitaciones
              </a>
              <Icon icon="solar:alt-arrow-right-linear" className="w-3 h-3" />
              <span className="text-midnight_text dark:text-white font-medium">
                Editar
              </span>
            </div>
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
                  Editar Capacitación
                </h1>
                <p className="text-xs text-dark_grey dark:text-gray-400 mt-0.5">
                  Modifique los campos y guarde los cambios
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Form Content — 80% width on desktop */}
        <div className="w-full lg:w-[80%] mx-auto px-4 py-8">
          <Form
              fields={fields}
              onSubmit={handleSubmit}
              submitLabel="Guardar Cambios"
              initialValues={initialData}
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

export default EditarCapacitacionPage;
