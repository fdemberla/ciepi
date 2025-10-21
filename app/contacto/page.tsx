"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import type { FormFieldOrSection } from "@/components/Form.types";
import Form from "@/components/Form";

const Page = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tiposConsulta, setTiposConsulta] = useState<Array<{ label: string; value: number }>>([]);
  const [sedes, setSedes] = useState<Array<{ label: string; value: number }>>([]);
  const [areas, setAreas] = useState<Array<{ label: string; value: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOpciones();
  }, []);

  const fetchOpciones = async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      
      const [tiposRes, sedesRes, areasRes] = await Promise.all([
        fetch(`${basePath}/api/admin/tipos-consultas`),
        fetch(`${basePath}/api/sedes`),
        fetch(`${basePath}/api/areas`),
      ]);

      if (tiposRes.ok) {
        const tiposData = await tiposRes.json();
        setTiposConsulta(
          tiposData.data
            .filter((t: { activo: boolean }) => t.activo)
            .map((t: { id: number; nombre: string }) => ({
              label: t.nombre,
              value: t.id,
            }))
        );
      }

      if (sedesRes.ok) {
        const sedesData = await sedesRes.json();
        setSedes(
          sedesData.sedes?.map((s: { id: number; nombre: string }) => ({
            label: s.nombre,
            value: s.id,
          })) || []
        );
      }

      if (areasRes.ok) {
        const areasData = await areasRes.json();
        setAreas(
          areasData.areas?.map((a: { id: number; nombre: string }) => ({
            label: a.nombre,
            value: a.id,
          })) || []
        );
      }
    } catch (error) {
      console.error("Error cargando opciones:", error);
    } finally {
      setLoading(false);
    }
  };

  const fields: FormFieldOrSection[] = [
    {
      name: "contacto",
      label: "Información de Contacto",
      type: "section",
      className: "text-blue-700",
      fields: [
        {
          name: "nombre",
          label: "Nombre",
          type: "text",
          required: true,
          errorMessage: "El nombre es obligatorio",
        },
        {
          name: "email",
          label: "Email",
          type: "email",
          required: true,
          errorMessage: "El email es obligatorio",
        },
        {
          name: "telefono",
          label: "Teléfono",
          type: "tel",
          required: true,
          errorMessage: "El teléfono es obligatorio",
        },
      ],
    },
    {
      name: "consulta",
      label: "Consulta",
      type: "section",
      className: "text-blue-700",
      fields: [
        {
          name: "tipoConsulta",
          label: "Tipo de consulta",
          type: "select",
          required: false,
          values: tiposConsulta.length > 0 ? tiposConsulta : [{ label: "Cargando...", value: "" }],
        },
        {
          name: "sede",
          label: "Sede",
          type: "select",
          required: false,
          values: sedes.length > 0 ? sedes : [{ label: "Cargando...", value: "" }],
        },
        {
          name: "areadeformacion",
          label: "Área de formación",
          type: "select",
          required: false,
          values: areas.length > 0 ? areas : [{ label: "Cargando...", value: "" }],
        },
        {
          name: "CursoInteres",
          label: "Curso de Interés",
          type: "text",
          required: false,
        },
        {
          name: "comentarios",
          label: "Comentarios",
          type: "textarea",
          required: true,
          errorMessage: "Los comentarios son obligatorios",
        },
      ],
    },
  ];

  const handleSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/contacto/consulta`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al enviar la consulta");
      }

      const result = await response.json();

      toast.success(
        result.message || "Consulta enviada exitosamente. Nos pondremos en contacto contigo pronto.",
        { duration: 5000 }
      );

      // Redirigir a inicio después de 2 segundos
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error) {
      console.error("Error enviando consulta:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al enviar la consulta"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary/20 border-t-primary"></div>
          <p className="mt-4 text-dark_grey dark:text-gray-400">
            Cargando formulario...
          </p>
        </div>
      </div>
    );
  }

  return (
    <Form
      title="Contacto"
      fields={fields}
      onSubmit={handleSubmit}
      submitLabel="Enviar Consulta"
      requireCaptcha={true}
      siteKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
      isSubmitting={isSubmitting}
    />
  );
};

export default Page;
