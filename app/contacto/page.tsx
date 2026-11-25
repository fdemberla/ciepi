"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import type { FormFieldOrSection } from "@/components/Form.types";
import Form from "@/components/Form";
import PrivacyConsentCheckbox from "@/components/PrivacyConsentCheckbox";

const Page = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [tiposConsulta, setTiposConsulta] = useState<
    Array<{ label: string; value: number }>
  >([]);
  const [sedes, setSedes] = useState<Array<{ label: string; value: number }>>(
    [],
  );
  const [areas, setAreas] = useState<Array<{ label: string; value: number }>>(
    [],
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [aceptoPolitica, setAceptoPolitica] = useState(false);

  useEffect(() => {
    fetchOpciones();
  }, []);

  const fetchOpciones = async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

      const [tiposRes, sedesRes, areasRes] = await Promise.all([
        fetch(`${basePath}/api/tipos-consultas`),
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
            })),
        );
      }

      if (sedesRes.ok) {
        const sedesData = await sedesRes.json();
        setSedes(
          sedesData.sedes?.map((s: { id: number; nombre: string }) => ({
            label: s.nombre,
            value: s.id,
          })) || [],
        );
      }

      if (areasRes.ok) {
        const areasData = await areasRes.json();
        setAreas(
          areasData.areas?.map((a: { id: number; nombre: string }) => ({
            label: a.nombre,
            value: a.id,
          })) || [],
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
          values:
            tiposConsulta.length > 0
              ? tiposConsulta
              : [{ label: "Cargando...", value: "" }],
        },
        {
          name: "sede",
          label: "Sede",
          type: "select",
          required: false,
          values:
            sedes.length > 0 ? sedes : [{ label: "Cargando...", value: "" }],
        },
        {
          name: "areadeformacion",
          label: "Área de formación",
          type: "select",
          required: false,
          values:
            areas.length > 0 ? areas : [{ label: "Cargando...", value: "" }],
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
    if (!aceptoPolitica) {
      toast.error(
        "Debes aceptar la Política de Privacidad para enviar tu consulta.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/contacto/consulta`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...data, aceptoPolitica }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Error al enviar la consulta");
      }

      const result = await response.json();

      toast.success(
        result.message ||
          "Consulta enviada exitosamente. Nos pondremos en contacto contigo pronto.",
        { duration: 5000 },
      );

      // Redirigir a inicio después de 2 segundos
      setTimeout(() => {
        router.push("/");
      }, 2000);
    } catch (error) {
      console.error("Error enviando consulta:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al enviar la consulta",
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
    <div className="min-h-screen bg-slateGray dark:bg-gray-900">
      {/* Hero Band */}
      <div className="bg-gradient-to-b from-primary/8 via-primary/3 to-transparent pt-28 pb-10">
        <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4">
          <div className="text-center animate-fade-up">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Icon
                icon="solar:chat-line-bold"
                className="text-success text-xl"
              />
              <p className="text-success text-sm font-semibold uppercase tracking-wide">
                Estamos aquí para ayudarte
              </p>
            </div>
            <h1 className="text-midnight_text dark:text-white text-4xl sm:text-5xl font-bold mb-3 relative inline-block">
              Contacto
              <span className="block h-1 w-12 bg-secondary rounded-full mx-auto mt-3"></span>
            </h1>
            <p className="text-dark_grey dark:text-gray-400 text-lg max-w-xl mx-auto mt-4">
              Envíanos tu consulta y te responderemos a la brevedad posible.
            </p>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="container mx-auto lg:max-w-screen-xl md:max-w-screen-md px-4 py-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left: Contact Info Panel */}
          <aside className="lg:col-span-4 space-y-5 animate-fade-up delay-100">
            {/* Contact details card */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-md border border-gray-100 dark:border-gray-700 p-8">
              <h2 className="text-xl font-bold text-midnight_text dark:text-white mb-6 border-l-4 border-primary pl-3">
                Información de Contacto
              </h2>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon
                      icon="solar:map-point-bold"
                      className="text-primary text-xl"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-midnight_text dark:text-white text-sm">
                      Ubicación
                    </p>
                    <p className="text-dark_grey dark:text-gray-400 text-sm mt-1">
                      Panamá, República de Panamá
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon
                      icon="solar:phone-bold"
                      className="text-primary text-xl"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-midnight_text dark:text-white text-sm">
                      Teléfono
                    </p>
                    <p className="text-dark_grey dark:text-gray-400 text-sm mt-1">
                      +507 0000-0000
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon
                      icon="solar:letter-bold"
                      className="text-primary text-xl"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-midnight_text dark:text-white text-sm">
                      Correo Electrónico
                    </p>
                    <p className="text-dark_grey dark:text-gray-400 text-sm mt-1">
                      info@ciepi.pa
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Icon
                      icon="solar:clock-circle-bold"
                      className="text-primary text-xl"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-midnight_text dark:text-white text-sm">
                      Horario de Atención
                    </p>
                    <p className="text-dark_grey dark:text-gray-400 text-sm mt-1">
                      Lunes a Viernes
                      <br />
                      8:00am – 4:00pm
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Promo info card */}
            <div className="bg-gradient-to-br from-primary to-blue-700 rounded-2xl p-6 text-white shadow-md">
              <Icon
                icon="solar:info-circle-bold"
                className="text-white/70 text-3xl mb-3"
              />
              <h3 className="font-bold text-lg mb-2">
                ¿Necesitas ayuda inmediata?
              </h3>
              <p className="text-white/80 text-sm leading-relaxed">
                También puedes visitar nuestras instalaciones durante el horario
                de atención o llamarnos directamente.
              </p>
            </div>
          </aside>

          {/* Right: Form */}
          <div className="lg:col-span-8 animate-fade-up delay-200">
            <Form
              title="Envía tu Consulta"
              fields={fields}
              onSubmit={handleSubmit}
              submitLabel="Enviar Consulta"
              requireCaptcha={true}
              siteKey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}
              isSubmitting={isSubmitting}
            >
              <PrivacyConsentCheckbox
                id="contacto-privacidad"
                checked={aceptoPolitica}
                onChange={setAceptoPolitica}
                disabled={isSubmitting}
                purpose="para atender, responder y dar seguimiento a mi consulta o solicitud de información"
              />
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
