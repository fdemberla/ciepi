"use client";
import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import Form from "@/components/Form";
import type { FormFieldOrSection } from "@/components/Form.types";

interface Capacitacion {
  id: number;
  nombre: string;
  descripcion: unknown;
  cantidad_horas: number | null;
  fecha_inicio_inscripcion: string | null;
  fecha_final_inscripcion: string | null;
}

interface EstudianteData {
  id?: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  nombre_cedula: string;
  sexo?: string;
  estado_civil?: string;
  fecha_nacimiento?: string;
  correo?: string;
  telefono?: string;
}

export default function InscribirsePage() {
  const params = useParams();
  const router = useRouter();
  const capacitacionId = params.id as string;

  const [step, setStep] = useState<"cedula" | "form" | "loading">("cedula");
  const [cedula, setCedula] = useState("");
  const [capacitacion, setCapacitacion] = useState<Capacitacion | null>(null);
  const [estudianteData, setEstudianteData] = useState<EstudianteData | null>(
    null
  );
  const [isExistingStudent, setIsExistingStudent] = useState(false);
  const [provincias, setProvincias] = useState<
    Array<{ id: number; nombre: string }>
  >([]);
  const [distritos, setDistritos] = useState<
    Array<{ id: number; nombre: string }>
  >([]);
  const [corregimientos, setCorregimientos] = useState<
    Array<{ id: number; nombre: string }>
  >([]);
  const [selectedProvinciaId, setSelectedProvinciaId] = useState<number | null>(
    null
  );
  const [selectedDistritoId, setSelectedDistritoId] = useState<number | null>(
    null
  );
  const [selectedCorregimientoId, setSelectedCorregimientoId] = useState<
    number | null
  >(null);
  const [formKey, setFormKey] = useState(0); // Para forzar re-render del Form
  const [canEditFields, setCanEditFields] = useState(false);
  const [birthDateConfirmed, setBirthDateConfirmed] = useState(false);
  const [birthDateInput, setBirthDateInput] = useState("");
  const [showBirthDateConfirmation, setShowBirthDateConfirmation] =
    useState(false);
  const [currentFormData, setCurrentFormData] = useState<
    Record<string, unknown>
  >({});
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);

  useEffect(() => {
    fetchCapacitacion();
    fetchProvincias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacitacionId]);

  const fetchCapacitacion = async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(
        `${basePath}/api/admin/capacitaciones/${capacitacionId}`
      );

      if (!response.ok) {
        throw new Error("Error al cargar la capacitación");
      }

      const data = await response.json();
      setCapacitacion(data.data);
    } catch (error) {
      console.error("Error fetching capacitacion:", error);
      toast.error("Error al cargar la capacitación");
      router.push("/capacitaciones");
    }
  };

  const fetchProvincias = async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/ubicacion/provincias`);
      const data = await response.json();
      if (data.success) {
        setProvincias(data.data);
      }
    } catch (error) {
      console.error("Error fetching provincias:", error);
    }
  };

  const fetchDistritos = async (provinciaId: string) => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(
        `${basePath}/api/ubicacion/distritos/${provinciaId}`
      );
      const data = await response.json();
      if (data.success) {
        setDistritos(data.data);
        setCorregimientos([]); // Limpiar corregimientos cuando cambia la provincia
      }
    } catch (error) {
      console.error("Error fetching distritos:", error);
      setDistritos([]);
      setCorregimientos([]);
    }
  };

  const fetchCorregimientos = async (distritoId: string) => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(
        `${basePath}/api/ubicacion/corregimientos/${distritoId}`
      );
      const data = await response.json();
      if (data.success) {
        setCorregimientos(data.data);
      }
    } catch (error) {
      console.error("Error fetching corregimientos:", error);
      setCorregimientos([]);
    }
  };

  const fetchStudentLocation = async (studentId: number) => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(
        `${basePath}/api/estudiante/ubicacion/${studentId}`
      );
      const data = await response.json();
      if (data.success && data.data) {
        const location = data.data;
        setSelectedProvinciaId(location.provincia_id);
        setSelectedDistritoId(location.distrito_id);
        setSelectedCorregimientoId(location.corregimiento_id);

        // Load districts and corregimientos if they exist
        if (location.provincia_id) {
          await fetchDistritos(String(location.provincia_id));
        }
        if (location.distrito_id) {
          await fetchCorregimientos(String(location.distrito_id));
        }

        return location;
      }
    } catch (error) {
      console.error("Error fetching student location:", error);
    }
    return null;
  };

  // Function to get initial values preserving current form data
  const getInitialValues = () => {
    const baseValues = estudianteData
      ? {
          nombres: estudianteData.nombres,
          apellidos: estudianteData.apellidos,
          nombre_cedula: estudianteData.nombre_cedula,
          sexo: estudianteData.sexo,
          estado_civil: estudianteData.estado_civil,
          fecha_nacimiento: estudianteData.fecha_nacimiento,
          correo: estudianteData.correo,
          telefono: estudianteData.telefono,
        }
      : {};

    return {
      ...baseValues,
      ...currentFormData, // Preserve current form inputs
      provincia_id: selectedProvinciaId,
      distrito_id: selectedDistritoId,
      corregimiento_id: selectedCorregimientoId,
    };
  };

  const handleVerificarCedula = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cedula.trim()) {
      toast.error("Por favor ingrese su cédula");
      return;
    }

    setStep("loading");

    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/verificar/${cedula}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al verificar la cédula");
      }

      if (data.exists) {
        // El estudiante ya existe
        setEstudianteData(data.estudiante);
        setIsExistingStudent(true);

        // Fetch existing location data
        await fetchStudentLocation(data.estudiante.id);

        // Show birth date confirmation for existing students
        setShowBirthDateConfirmation(true);
        toast.success(
          "¡Bienvenido de nuevo! Por favor confirme su fecha de nacimiento para continuar."
        );
      } else {
        // Estudiante nuevo, usar datos del API externo
        setEstudianteData(data.external_data);
        setIsExistingStudent(false);
        toast.success(
          "Cédula verificada. Por favor complete sus datos de inscripción."
        );
      }

      setStep("form");
    } catch (error) {
      console.error("Error verificando cédula:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al verificar la cédula"
      );
      setStep("cedula");
    }
  };

  const handleBirthDateConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!birthDateInput.trim()) {
      toast.error("Por favor ingrese su fecha de nacimiento");
      return;
    }

    if (!estudianteData?.fecha_nacimiento) {
      toast.error("No se encontró fecha de nacimiento en el sistema");
      return;
    }

    // Validar formato DD/MM/YYYY
    const datePattern = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = birthDateInput.match(datePattern);

    if (!match) {
      toast.error("Formato de fecha inválido. Use DD/MM/YYYY (ej: 15/03/1990)");
      return;
    }

    const [, day, month, year] = match;

    // Validar que sea una fecha válida
    const dayNum = parseInt(day, 10);
    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (monthNum < 1 || monthNum > 12) {
      toast.error("Mes inválido. Debe estar entre 01 y 12");
      return;
    }

    if (dayNum < 1 || dayNum > 31) {
      toast.error("Día inválido. Debe estar entre 01 y 31");
      return;
    }

    // Validar que la fecha sea válida en el calendario (ej: no 31/02)
    const testDate = new Date(yearNum, monthNum - 1, dayNum);
    if (
      testDate.getDate() !== dayNum ||
      testDate.getMonth() !== monthNum - 1 ||
      testDate.getFullYear() !== yearNum
    ) {
      toast.error("Fecha inválida. Verifique el día y mes ingresados");
      return;
    }

    // Convertir a formato YYYY-MM-DD para comparar con la BD
    const formattedDate = `${year}-${month}-${day}`;

    // Compare birth dates
    if (formattedDate === estudianteData.fecha_nacimiento) {
      setBirthDateConfirmed(true);
      setCanEditFields(true);
      setShowBirthDateConfirmation(false);
      setStep("form");
      toast.success(
        "Fecha de nacimiento confirmada. Puede editar sus datos si es necesario."
      );
    } else {
      toast.error("La fecha de nacimiento no coincide con nuestros registros");
      setBirthDateInput("");
    }
  };

  const checkEmailAvailability = async (email: string) => {
    if (!email || !email.includes("@")) {
      setEmailError(null);
      return;
    }

    setIsCheckingEmail(true);
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(`${basePath}/api/verificar/${cedula}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          correo: email,
          cedula_actual: estudianteData?.cedula,
        }),
      });

      const data = await response.json();

      if (!data.available) {
        setEmailError(data.message);
      } else {
        setEmailError(null);
      }
    } catch (error) {
      console.error("Error checking email:", error);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleSubmit = async (formData: Record<string, unknown>) => {
    try {
      // Validate birth date for existing students
      if (isExistingStudent && !birthDateConfirmed) {
        toast.error("Debe confirmar su fecha de nacimiento para continuar");
        return;
      }

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";

      // Preparar los datos para enviar
      const payload = {
        // Datos del estudiante
        estudiante: {
          id: estudianteData?.id,
          cedula: estudianteData?.cedula,
          nombres: formData.nombres || estudianteData?.nombres,
          apellidos: formData.apellidos || estudianteData?.apellidos,
          nombre_cedula:
            formData.nombre_cedula || estudianteData?.nombre_cedula,
          sexo: formData.sexo || estudianteData?.sexo,
          estado_civil: formData.estado_civil || estudianteData?.estado_civil,
          fecha_nacimiento:
            formData.fecha_nacimiento || estudianteData?.fecha_nacimiento,
          correo: formData.correo,
          telefono: formData.telefono,
        },
        // Datos de ubicación
        ubicacion: {
          provincia_id: formData.provincia_id,
          distrito_id: formData.distrito_id,
          corregimiento_id: formData.corregimiento_id,
          calle: formData.calle,
        },
        // ID de la capacitación
        capacitacion_id: capacitacionId,
      };

      const response = await fetch(
        `${basePath}/api/capacitaciones/inscribirse/${capacitacionId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        // Manejar errores específicos de duplicación
        if (response.status === 409) {
          if (result.field === "correo") {
            toast.error(`Correo duplicado: ${result.message}`);
          } else if (result.field === "cedula") {
            toast.error(`Cédula duplicada: ${result.message}`);
          } else {
            toast.error(result.message || "Error: Datos duplicados");
          }
          return;
        }

        throw new Error(result.error || "Error al procesar la inscripción");
      }

      // Verificar si requiere verificación de correo
      if (result.verification_required) {
        toast.success(
          "Correo de verificación enviado. Por favor revisa tu email."
        );
        // Redirigir a página de espera con el token
        setTimeout(() => {
          router.push(`/verificacion/esperando/${result.token}`);
        }, 1500);
      } else {
        // Inscripción completada inmediatamente (correo ya verificado)
        toast.success("¡Inscripción exitosa!");
        setTimeout(() => {
          router.push("/capacitaciones");
        }, 1500);
      }
    } catch (error) {
      console.error("Error en inscripción:", error);
      toast.error(
        error instanceof Error ? error.message : "Error al inscribirse"
      );
    }
  };

  // Formulario de cédula
  if (step === "cedula") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Inscripción a Capacitación
            </h1>
            {capacitacion && (
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                {capacitacion.nombre}
              </p>
            )}

            <form onSubmit={handleVerificarCedula}>
              <div className="mb-6">
                <label
                  htmlFor="cedula"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Número de Cédula
                </label>
                <input
                  type="text"
                  id="cedula"
                  value={cedula}
                  onChange={(e) => setCedula(e.target.value)}
                  placeholder="Ej: 8-123-456"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Ingrese su cédula para verificar su información
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Verificar Cédula
              </button>
            </form>

            <button
              onClick={() => router.push("/capacitaciones")}
              className="w-full mt-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (step === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">
            Verificando cédula...
          </p>
        </div>
      </div>
    );
  }

  // Birth date confirmation for existing students
  if (showBirthDateConfirmation) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4">
        <div className="max-w-md mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Confirmar Identidad
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              Para editar sus datos, por favor confirme su fecha de nacimiento
            </p>

            <form onSubmit={handleBirthDateConfirmation}>
              <div className="mb-6">
                <label
                  htmlFor="birthDate"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Fecha de Nacimiento
                </label>
                <input
                  type="text"
                  id="birthDate"
                  value={birthDateInput}
                  onChange={(e) => {
                    let value = e.target.value.replace(/[^\d]/g, ""); // Solo números

                    // Auto-formatear con barras mientras escribe
                    if (value.length >= 2) {
                      value = value.slice(0, 2) + "/" + value.slice(2);
                    }
                    if (value.length >= 5) {
                      value = value.slice(0, 5) + "/" + value.slice(5);
                    }

                    // Limitar a 10 caracteres (DD/MM/YYYY)
                    if (value.length <= 10) {
                      setBirthDateInput(value);
                    }
                  }}
                  onKeyDown={(e) => {
                    // Permitir borrar las barras con Backspace
                    if (
                      e.key === "Backspace" &&
                      (birthDateInput.endsWith("/") ||
                        birthDateInput.length === 3 ||
                        birthDateInput.length === 6)
                    ) {
                      e.preventDefault();
                      setBirthDateInput(birthDateInput.slice(0, -1));
                    }
                  }}
                  placeholder="DD/MM/YYYY (ej: 15/03/1990)"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                  maxLength={10}
                />
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  Ingrese su fecha de nacimiento en formato DD/MM/YYYY para
                  verificar su identidad
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Confirmar
              </button>
            </form>

            <button
              onClick={() => {
                setShowBirthDateConfirmation(false);
                setStep("cedula");
                setBirthDateInput("");
              }}
              className="w-full mt-4 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Formulario completo
  const ubicacionFields: Array<FormFieldOrSection> = [
    {
      name: "provincia_id",
      label: "Provincia",
      type: "select",
      required: true,
      options: provincias.map((p) => ({
        label: p.nombre,
        value: p.id,
      })),
    },
  ];

  // Solo mostrar distrito si hay distritos disponibles
  if (distritos.length > 0) {
    ubicacionFields.push({
      name: "distrito_id",
      label: "Distrito",
      type: "select",
      required: true,
      options: distritos.map((d) => ({
        label: d.nombre,
        value: d.id,
      })),
    });
  }

  // Solo mostrar corregimiento si hay corregimientos disponibles
  if (corregimientos.length > 0) {
    ubicacionFields.push({
      name: "corregimiento_id",
      label: "Corregimiento",
      type: "select",
      required: true,
      options: corregimientos.map((c) => ({
        label: c.nombre,
        value: c.id,
      })),
    });
  }

  // Siempre mostrar el campo de calle
  ubicacionFields.push({
    name: "calle",
    label: "Dirección / Calle",
    type: "textarea",
    required: true,
  });

  const formFields: FormFieldOrSection[] = [
    {
      name: "datosPersonales",
      label: "Datos Personales",
      type: "section",
      className: "text-blue-700",
      fields: [
        {
          name: "nombres",
          label: "Nombres",
          type: "text",
          required: true,
          disabled: !canEditFields, // Editable si se confirmó la fecha de nacimiento
        },
        {
          name: "apellidos",
          label: "Apellidos",
          type: "text",
          required: true,
          disabled: !canEditFields, // Editable si se confirmó la fecha de nacimiento
        },
        {
          name: "nombre_cedula",
          label: "Nombre completo según cédula",
          type: "text",
          required: true,
          disabled: true, // Siempre deshabilitado porque viene del API
        },
        {
          name: "sexo",
          label: "Sexo",
          type: "select",
          required: false,
          options: [
            { label: "Masculino", value: "M" },
            { label: "Femenino", value: "F" },
          ],
          disabled: true, // Siempre deshabilitado porque viene del API
        },
        {
          name: "estado_civil",
          label: "Estado Civil",
          type: "select",
          required: false,
          options: [
            { label: "Soltero", value: "S" },
            { label: "Casado", value: "C" },
            { label: "Viudo", value: "V" },
          ],
          disabled: true, // Siempre deshabilitado porque viene del API
        },
        // Fecha de nacimiento se oculta del formulario - solo se usa para confirmación
      ],
    },
    {
      name: "contacto",
      label: "Información de Contacto",
      type: "section",
      className: "text-green-700",
      fields: [
        {
          name: "correo",
          label: "Correo Electrónico",
          type: "email",
          required: true,
          disabled: false, // Siempre editable
        },
        {
          name: "telefono",
          label: "Teléfono",
          type: "tel",
          required: true,
          disabled: false, // Siempre editable
        },
      ],
    },
    {
      name: "ubicacion",
      label: "Ubicación",
      type: "section",
      className: "text-purple-700",
      fields: ubicacionFields,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      {isExistingStudent && canEditFields && (
        <div className="max-w-2xl mx-auto px-4 mb-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-blue-800 dark:text-blue-200 text-sm">
                Puede editar sus nombres y apellidos si es necesario. Los demás
                datos personales se mantienen según el sistema nacional.
              </p>
            </div>
          </div>
        </div>
      )}
      {emailError && (
        <div className="max-w-2xl mx-auto px-4 mb-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-red-800 dark:text-red-200 text-sm font-medium">
                {emailError}
              </p>
            </div>
          </div>
        </div>
      )}
      {isCheckingEmail && (
        <div className="max-w-2xl mx-auto px-4 mb-4">
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 dark:border-gray-400 mr-2"></div>
              <p className="text-gray-700 dark:text-gray-300 text-sm">
                Verificando disponibilidad del correo...
              </p>
            </div>
          </div>
        </div>
      )}
      <Form
        key={formKey}
        title={`Inscripción: ${capacitacion?.nombre || "Cargando..."}`}
        fields={formFields}
        onSubmit={handleSubmit}
        submitLabel="Completar Inscripción"
        initialValues={getInitialValues()}
        onFieldChange={(fieldName, value) => {
          // Track all form data changes to preserve inputs during re-renders
          setCurrentFormData((prev) => ({
            ...prev,
            [fieldName]: value,
          }));

          // Validar correo en tiempo real
          if (fieldName === "correo" && typeof value === "string") {
            // Debounce: esperar 500ms después de que el usuario deje de escribir
            const timeoutId = setTimeout(() => {
              checkEmailAvailability(value);
            }, 500);

            return () => clearTimeout(timeoutId);
          }

          if (fieldName === "provincia_id" && value) {
            const provinciaId = Number(value);
            setSelectedProvinciaId(provinciaId);
            // Limpiar distrito y corregimiento cuando cambia la provincia
            setSelectedDistritoId(null);
            setSelectedCorregimientoId(null);
            setDistritos([]);
            setCorregimientos([]);
            setFormKey((prev) => prev + 1); // Forzar re-render del Form
            fetchDistritos(String(value));
          } else if (fieldName === "distrito_id" && value) {
            const distritoId = Number(value);
            setSelectedDistritoId(distritoId);
            // Limpiar corregimiento cuando cambia el distrito
            setSelectedCorregimientoId(null);
            setCorregimientos([]);
            setFormKey((prev) => prev + 1); // Forzar re-render del Form
            fetchCorregimientos(String(value));
          } else if (fieldName === "corregimiento_id" && value) {
            const corregimientoId = Number(value);
            setSelectedCorregimientoId(corregimientoId);
          }
        }}
      />
    </div>
  );
}
