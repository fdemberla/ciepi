"use client";
import React from "react";

import type { FormFieldOrSection } from "@/components/Form.types";
import Form from "@/components/Form";

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
        regex: "^[A-Za-z ]+$",
      },
      {
        name: "email",
        label: "Email",
        type: "email",
        required: true,
        errorMessage: "El email es obligatorio",
        regex: "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}$",
      },
      {
        name: "telefono",
        label: "Teléfono",
        type: "tel",
        required: true,
        errorMessage: "El teléfono es obligatorio",
        regex: "^[0-9]{10}$",
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
        required: true,
        values: [
          { label: "General", value: "general" },
          { label: "Soporte", value: "soporte" },
        ],
      },
      {
        name: "sede",
        label: "Sede",
        type: "select",
        required: true,
        values: [
          { label: "CABA", value: "caba" },
          { label: "Zona Norte", value: "zona-norte" },
        ],
      },
      {
        name: "areadeformacion",
        label: "Área de formación",
        type: "select",
        required: true,
        values: [
          { label: "Administración", value: "administracion" },
          { label: "Salud", value: "salud" },
        ],
      },
      {
        name: "CursoInteres",
        label: "Curso de Interés",
        type: "text",
        required: true,
        errorMessage: "El Curso de Interés es obligatorio",
      },
      {
        name: "comentarios",
        label: "Comentarios",
        type: "textarea",
        required: true,
      },
    ],
  },
];

const Page = () => {
  const handleSubmit = (data: Record<string, unknown>) => {
    // handle form data
    console.log({ data });
  };

  return (
    <Form
      title="Contacto"
      fields={fields}
      onSubmit={handleSubmit}
      submitLabel="Guardar"
      requireCaptcha={true}
      siteKey={process.env.CLAVE_SITIO_RECAPTCHA}
    />
  );
};

export default Page;
