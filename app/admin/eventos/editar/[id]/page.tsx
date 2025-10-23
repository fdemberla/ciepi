"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Form from "@/components/Form";
import type { FormFieldConfig } from "@/components/Form.types";

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
    {}
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

      // Convertir fechas al formato datetime-local
      const formatDateForInput = (dateString: string) => {
        const date = new Date(dateString);
        return date.toISOString().slice(0, 16);
      };

      setInitialValues({
        nombre: eventoData.nombre || "",
        descripcion: eventoData.descripcion || "",
        fecha_inicio: formatDateForInput(eventoData.fecha_inicio),
        fecha_fin: formatDateForInput(eventoData.fecha_fin),
        ubicacion: eventoData.ubicacion || "",
      });
    } catch (err) {
      console.error("Error fetching evento:", err);
      setError(
        err instanceof Error ? err.message : "Error al cargar el evento"
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
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || errorData.error || "Error al actualizar evento"
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
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-[#1A21BC]/20 border-t-[#1A21BC]"></div>
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
    <Form
      fields={formFields}
      onSubmit={handleSubmit}
      title={`Editar Evento: ${evento.nombre}`}
      submitLabel="Guardar Cambios"
      initialValues={initialValues}
      isSubmitting={isSubmitting}
    />
  );
};

export default EditarEventoPage;
