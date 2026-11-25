"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Icon } from "@iconify/react";
import Form from "@/components/Form";
import type { FormFieldConfig } from "@/components/Form.types";
import { toDateTimeLocalInput } from "@/lib/dateInput";

interface Evento {
  id: number;
  nombre: string;
  descripcion: unknown;
  fecha_inicio: string;
  fecha_fin: string;
  ubicacion: string | null;
  banner: string | null;
  galeria: unknown;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

const EditarEventoPage = () => {
  const router = useRouter();
  const params = useParams();
  const eventoId = params.id as string;

  const [evento, setEvento] = useState<Evento | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string>("");
  const [initialValues, setInitialValues] = useState<Record<string, unknown>>(
    {},
  );

  useEffect(() => {
    fetchEvento();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventoId]);

  const fetchEvento = async () => {
    try {
      setLoading(true);
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/admin/eventos/${eventoId}`);

      if (!response.ok) {
        throw new Error("Error al cargar el evento");
      }

      const data = await response.json();
      const eventoData = data.data;
      setEvento(eventoData);

      setInitialValues({
        nombre: eventoData.nombre || "",
        descripcion: eventoData.descripcion || "",
        fecha_inicio: toDateTimeLocalInput(eventoData.fecha_inicio),
        fecha_fin: toDateTimeLocalInput(eventoData.fecha_fin),
        ubicacion: eventoData.ubicacion || "",
      });
    } catch (err) {
      console.error("Error fetching evento:", err);
      setError(
        err instanceof Error ? err.message : "Error al cargar el evento",
      );
    } finally {
      setLoading(false);
    }
  };

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
        "Clic para cargar una nueva imagen o arrastra y suelta (PNG, JPG hasta 5MB)",
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
      const response = await fetch(
        `${basePath}/api/admin/eventos/${eventoId}`,
        {
          method: "PUT",
          body: submitFormData,
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Error al actualizar evento",
        );
      }

      router.push("/admin/eventos");
    } catch (err) {
      console.error("Error updating evento:", err);
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
          <p className="mt-6 text-midnight_text dark:text-white text-lg font-medium">
            Cargando evento...
          </p>
        </div>
      </div>
    );
  }

  if (!evento) {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-10 max-w-md">
          <p className="text-midnight_text dark:text-white mb-6 text-lg">
            {error || "Evento no encontrado"}
          </p>
          <button
            onClick={() => router.push("/admin/eventos")}
            className="px-10 py-4 bg-primary text-white rounded-full hover:bg-primary/90 transition-all duration-300 shadow-lg font-medium text-lg"
          >
            Volver a Eventos
          </button>
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
              onClick={() => router.push("/admin/eventos")}
              className="hover:text-primary transition-colors"
            >
              Eventos
            </button>
            <Icon icon="solar:alt-arrow-right-linear" className="w-3 h-3" />
            <span className="text-midnight_text dark:text-white font-medium">
              Editar
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
                {evento.nombre}
              </h1>
              <p className="text-xs text-dark_grey dark:text-gray-400 mt-0.5">
                Modifique los campos y guarde los cambios
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
            submitLabel="Guardar Cambios"
            initialValues={initialValues}
            isSubmitting={isSubmitting}
          />
        </div>
      </div>
    </div>
  );
};

export default EditarEventoPage;
