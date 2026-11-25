"use client";
import React, { useState, useEffect, useReducer } from "react";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Icon } from "@iconify/react";
import Form from "@/components/Form";
import type { FormFieldOrSection } from "@/components/Form.types";
import PrivacyConsentCheckbox from "@/components/PrivacyConsentCheckbox";
import TurnstileWidget, {
  isTurnstileClientEnabled,
} from "@/components/TurnstileWidget";
import { withBasePath } from "@/lib/basePath";
import {
  INITIAL_INSCRIPCION_FLOW_STATE,
  inscripcionFlowReducer,
} from "@/lib/inscripcionFlow";
import {
  iniciarValidacionBiometrica,
  getStoredBiometriaResult,
  clearBiometriaResult,
  isBiometriaEnabled,
  BIOMETRIA_STORAGE_KEYS,
  BiometriaResult,
} from "@/lib/biometria";

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

interface VistaSesion {
  cedula: string;
  exists: boolean;
  estudiante: EstudianteData;
  ubicacion: {
    provincia_id: number | null;
    distrito_id: number | null;
    corregimiento_id: number | null;
  } | null;
  biometria: BiometriaResult | null;
}

export default function InscribirsePage() {
  const params = useParams();
  const router = useRouter();
  const capacitacionId = params.id as string;

  const [flow, dispatchFlow] = useReducer(
    inscripcionFlowReducer,
    INITIAL_INSCRIPCION_FLOW_STATE,
  );
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
  const [birthDateInput, setBirthDateInput] = useState("");
  const [currentFormData, setCurrentFormData] = useState<
    Record<string, unknown>
  >({});
  const [emailError, setEmailError] = useState<string | null>(null);
  const [biometriaResult, setBiometriaResult] =
    useState<BiometriaResult | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [aceptoPoliticaCedula, setAceptoPoliticaCedula] = useState(false);
  const biometriaEnabled = isBiometriaEnabled();

  const isSubmitting = flow.step === "form" && flow.busy;
  const isCheckingEmail = flow.step === "form" && flow.isCheckingEmail;
  const isInitiatingBiometria =
    flow.step === "metodo" && flow.isInitiatingBiometria;
  const metodoValidacion =
    flow.step === "form" ? flow.metodoValidacion : null;
  const birthDateConfirmed =
    flow.step === "form" ? flow.birthDateConfirmed : false;

  useEffect(() => {
    fetchCapacitacion();
    fetchProvincias();
    restaurarSesion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [capacitacionId]);

  /** Aplica los datos que devuelve el servidor tras verificar la identidad. */
  const aplicarVistaSesion = async (vista: VistaSesion) => {
    setEstudianteData(vista.estudiante);
    setIsExistingStudent(Boolean(vista.exists));
    setCedula(vista.cedula);
    const u = vista.ubicacion;
    if (u) {
      setSelectedProvinciaId(u.provincia_id);
      setSelectedDistritoId(u.distrito_id);
      setSelectedCorregimientoId(u.corregimiento_id);
      if (u.provincia_id) await fetchDistritos(String(u.provincia_id));
      if (u.distrito_id) await fetchCorregimientos(String(u.distrito_id));
    }
  };

  /**
   * Si el servidor tiene una sesión de identidad verificada para esta capacitación
   * (p. ej. al volver del Hub biométrico o al recargar), retoma el asistente.
   * La biometría la decide el servidor; sessionStorage solo guarda datos de pantalla.
   */
  const restaurarSesion = async () => {
    try {
      const res = await fetch(withBasePath(`/api/capacitaciones/inscribirse/${capacitacionId}`));
      const data = await res.json();
      if (!data.activa) {
        const savedCedula =
          typeof window !== "undefined" ? sessionStorage.getItem(BIOMETRIA_STORAGE_KEYS.CEDULA) : null;
        if (savedCedula) setCedula(savedCedula);
        clearBiometriaResult();
        return;
      }
      await aplicarVistaSesion(data);
      const modoManual = new URLSearchParams(window.location.search).get("modo") === "manual";
      const conBiometria = Boolean(data.biometria?.valido) && !modoManual;
      setBiometriaResult(conBiometria ? getStoredBiometriaResult() ?? data.biometria : null);
      dispatchFlow({
        type: "SESION_RESTAURADA",
        cedula: data.cedula,
        isExistingStudent: Boolean(data.exists),
        paso: conBiometria || modoManual || !biometriaEnabled ? "form" : "metodo",
        metodo: conBiometria ? "biometrica" : "manual",
      });
    } catch (error) {
      console.error("No se pudo restaurar la inscripción:", error);
    }
  };

  const fetchCapacitacion = async () => {
    try {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const response = await fetch(
        `${basePath}/api/capacitaciones/${capacitacionId}`
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

  const cargarDatosEstudiante = async (cedulaValue: string) => {
    dispatchFlow({ type: "START_BUSY" });

    try {
      const headers: Record<string, string> = {};
      if (turnstileToken) {
        headers["x-turnstile-token"] = turnstileToken;
      }

      const response = await fetch(
        withBasePath(
          `/api/verificar/${encodeURIComponent(cedulaValue)}?capacitacion=${encodeURIComponent(capacitacionId)}`,
        ),
        { headers },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al verificar la cédula");
      }

      const resolvedCedula = data.cedula || cedulaValue;
      setCedula(resolvedCedula);
      setIsExistingStudent(Boolean(data.exists));
      dispatchFlow({
        type: "CEDULA_FOUND",
        cedula: resolvedCedula,
        isExistingStudent: Boolean(data.exists),
      });
    } catch (error) {
      console.error("Error verificando cédula:", error);
      const msg =
        error instanceof Error ? error.message : "Error al verificar la cédula";
      toast.error(msg);
      dispatchFlow({ type: "FAIL", error: msg });
    }
  };

  const handleVerificarCedula = async (e: React.FormEvent) => {
    e.preventDefault();
    if (flow.busy) return;

    if (!cedula.trim()) {
      toast.error("Por favor ingrese su cédula");
      return;
    }

    if (!aceptoPoliticaCedula) {
      toast.error(
        "Debes aceptar la Política de Privacidad para consultar tu cédula.",
      );
      return;
    }

    if (isTurnstileClientEnabled() && !turnstileToken) {
      toast.error("Completa la verificación de seguridad para continuar.");
      return;
    }

    await cargarDatosEstudiante(cedula.trim());
  };

  const handleIniciarBiometria = async () => {
    const cedulaEfectiva = estudianteData?.cedula || cedula.trim();
    if (!cedulaEfectiva) {
      toast.error("Primero debe verificar su número de cédula");
      dispatchFlow({ type: "BACK_TO_CEDULA" });
      return;
    }

    try {
      dispatchFlow({ type: "START_BIOMETRIA" });
      await iniciarValidacionBiometrica({
        capacitacionId,
        cedula: cedulaEfectiva,
      });
    } catch (error) {
      console.error("Error iniciando validación biométrica:", error);
      toast.error("Error al iniciar el servicio de validación biométrica");
      dispatchFlow({
        type: "FAIL",
        error: "Error al iniciar el servicio de validación biométrica",
      });
    }
  };

  const handleSeleccionarManual = () => {
    clearBiometriaResult();
    setBiometriaResult(null);
    dispatchFlow({ type: "SELECT_MANUAL" });
    toast.success(
      "Validación manual seleccionada. Su inscripción quedará como pendiente hasta que un administrador la valide."
    );
  };

  const handleBirthDateConfirmation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!birthDateInput.trim()) {
      toast.error("Por favor ingrese su fecha de nacimiento");
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

    if (flow.busy) return;
    try {
      dispatchFlow({ type: "START_BUSY" });
      const response = await fetch(
        withBasePath(`/api/verificar/${encodeURIComponent(cedula.trim())}`),
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fechaNacimiento: birthDateInput }),
        },
      );
      const data = await response.json();

      if (!response.ok || !data.verified) {
        const msg =
          data.error || "La fecha de nacimiento no coincide con nuestros registros";
        toast.error(msg);
        setBirthDateInput("");
        dispatchFlow({ type: "FAIL", error: msg });
        if (response.status === 401 || response.status === 429) {
          // Sesión vencida o bloqueada: hay que empezar de nuevo.
          dispatchFlow({ type: "BACK_TO_CEDULA" });
        }
        return;
      }
      const record = data.estudiante as EstudianteData;
      await aplicarVistaSesion(data);

      const nombreCompleto =
        record?.nombre_cedula ||
        `${record?.nombres || ""} ${record?.apellidos || ""}`.trim();

      dispatchFlow({
        type: "BIRTHDATE_VERIFIED",
        biometriaEnabled,
      });

      toast.success(
        nombreCompleto
          ? `Identidad verificada: ${nombreCompleto}`
          : "Fecha de nacimiento confirmada. Puede continuar con la inscripción.",
      );
    } catch (error) {
      console.error("Error confirmando fecha de nacimiento:", error);
      toast.error("Error al confirmar la fecha de nacimiento");
      dispatchFlow({
        type: "FAIL",
        error: "Error al confirmar la fecha de nacimiento",
      });
    }
  };

  const checkEmailAvailability = async (email: string) => {
    if (!email || !email.includes("@")) {
      setEmailError(null);
      return;
    }

    dispatchFlow({ type: "SET_CHECKING_EMAIL", checking: true });
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
      dispatchFlow({ type: "SET_CHECKING_EMAIL", checking: false });
    }
  };

  const [aceptoPolitica, setAceptoPolitica] = useState(false);

  const handleSubmit = async (formData: Record<string, unknown>) => {
    // Prevenir múltiples envíos
    if (isSubmitting) {
      return;
    }

    try {
      if (!aceptoPolitica) {
        toast.error(
          "Debes aceptar la Política de Privacidad para completar tu inscripción.",
        );
        return;
      }

      // Validate birth date for existing students
      if (isExistingStudent && !birthDateConfirmed) {
        toast.error("Debe confirmar su fecha de nacimiento para continuar");
        return;
      }

      dispatchFlow({ type: "START_BUSY" });

      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      const esBiometricaValida = Boolean(
        metodoValidacion === "biometrica" && biometriaResult?.valido
      );

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
        acepto_politica: aceptoPolitica,
        // Método de validación elegido ("biometrica" | "manual")
        metodo_validacion: esBiometricaValida ? "biometrica" : "manual",
        // La biometría NO se envía: el servidor usa la que validó con el Hub.
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

      if (response.status === 401) {
        toast.error(result.error || "Tu sesión expiró. Vuelve a ingresar tu cédula.");
        clearBiometriaResult();
        setBiometriaResult(null);
        dispatchFlow({ type: "BACK_TO_CEDULA" });
        return;
      }

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
          dispatchFlow({
            type: "FAIL",
            error: result.message || "Error: Datos duplicados",
          });
          return;
        }

        throw new Error(result.error || "Error al procesar la inscripción");
      }

      // Verificar si requiere verificación de correo
      if (result.verification_required) {
        clearBiometriaResult();
        if (result.correo_enviado === false) {
          toast.error(result.message, { duration: 8000 });
        } else toast.success(
          esBiometricaValida
            ? "Correo de verificación enviado. Por favor revisa tu email."
            : "Correo enviado. Al verificar tu correo, tu inscripción quedará como Pendiente hasta que un administrador la valide.",
          { duration: 6000 }
        );
        setTimeout(() => {
          router.push(`/verificacion/esperando/${result.consulta}`);
        }, 1500);
      } else {
        clearBiometriaResult();
        toast.success(
          esBiometricaValida
            ? "¡Inscripción exitosa!"
            : "Inscripción registrada como Pendiente de validación por un administrador."
        );
        setTimeout(() => {
          router.push("/capacitaciones");
        }, 1500);
      }
    } catch (error) {
      console.error("Error en inscripción:", error);
      const msg =
        error instanceof Error ? error.message : "Error al inscribirse";
      toast.error(msg);
      dispatchFlow({ type: "FAIL", error: msg });
    }
  };

  // Loading al consultar cédula
  if (flow.step === "cedula" && flow.busy) {
    return (
      <div className="min-h-screen bg-slateGray dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-primary/20 border-t-primary"></div>
          <p className="mt-6 text-midnight_text dark:text-white text-lg font-medium">
            Consultando datos en el Tribunal Electoral...
          </p>
        </div>
      </div>
    );
  }

  // PASO 1: Ingreso obligatorio de cédula y consulta con el Tribunal Electoral
  if (flow.step === "cedula") {
    return (
      <section className="min-h-screen bg-slateGray dark:bg-gray-900 py-16 px-4">
        <div className="max-w-xl mx-auto space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 sm:p-10 border border-gray-100 dark:border-gray-700">
            {/* Indicador de pasos */}
            <div className="flex items-center justify-center gap-2 mb-6 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-white">
                <span>1</span>
                <span>Cédula</span>
              </span>
              <div className="w-6 h-0.5 bg-gray-200 dark:bg-gray-700" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                <span>2</span>
                <span>Validación</span>
              </span>
              <div className="w-6 h-0.5 bg-gray-200 dark:bg-gray-700" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                <span>3</span>
                <span>Datos</span>
              </span>
            </div>

            {/* Badge de Verificación */}
            <div className="flex gap-2 items-center justify-center mb-3">
              <Icon
                icon="solar:shield-check-bold"
                className="text-primary text-2xl"
              />
              <p className="text-primary text-sm font-semibold tracking-wide">
                Paso 1: Consulta Oficial con el Tribunal Electoral
              </p>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-midnight_text dark:text-white mb-2 text-center">
              Inscripción a Capacitación
            </h1>
            {capacitacion && (
              <p className="text-dark_grey dark:text-gray-300 text-center mb-6 text-base sm:text-lg font-medium">
                {capacitacion.nombre}
              </p>
            )}

            <p className="text-sm text-dark_grey dark:text-gray-300 text-center mb-8 leading-relaxed">
              Ingrese su número de cédula para obtener sus datos del Tribunal
              Electoral. En el siguiente paso podrá elegir entre validación
              biométrica facial o validación presencial/manual.
            </p>

            {/* FORMULARIO OBLIGATORIO DE CÉDULA */}
            <form onSubmit={handleVerificarCedula}>
              <div className="mb-6">
                <label
                  htmlFor="cedula"
                  className="block text-sm font-semibold text-midnight_text dark:text-white mb-2"
                >
                  Número de Cédula <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Icon
                      icon="solar:card-linear"
                      className="text-dark_grey dark:text-gray-400 w-6 h-6"
                    />
                  </div>
                  <input
                    type="text"
                    id="cedula"
                    value={cedula}
                    onChange={(e) => setCedula(e.target.value)}
                    placeholder="Ej: 8-123-456"
                    className="w-full pl-14 pr-4 py-4 border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-midnight_text dark:text-white bg-white dark:bg-gray-700 font-medium text-base shadow-sm placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    required
                  />
                </div>
                <p className="mt-2 text-xs text-dark_grey dark:text-gray-400 flex items-center gap-1.5">
                  <Icon
                    icon="solar:info-circle-linear"
                    className="w-4 h-4 flex-shrink-0"
                  />
                  Sus datos serán validados de forma segura contra el padrón
                  oficial.
                </p>
              </div>

              <PrivacyConsentCheckbox
                id="cedula-privacidad"
                checked={aceptoPoliticaCedula}
                onChange={setAceptoPoliticaCedula}
                purpose="para consultar su identidad y gestionar su inscripción en esta capacitación"
              />

              <TurnstileWidget
                onVerify={setTurnstileToken}
                onExpire={() => setTurnstileToken("")}
              />

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-4 px-6 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl text-base mb-3 flex items-center justify-center gap-2"
              >
                <span>Validar Cédula y Continuar</span>
                <Icon icon="solar:arrow-right-linear" className="w-5 h-5" />
              </button>

              <button
                onClick={() => router.push("/capacitaciones")}
                type="button"
                className="w-full bg-slateGray dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-midnight_text dark:text-white font-semibold py-3.5 px-6 rounded-full transition-all text-sm"
              >
                Cancelar
              </button>
            </form>
          </div>
        </div>
      </section>
    );
  }

  // Confirmación de fecha de nacimiento
  if (flow.step === "confirmar_nacimiento") {
    return (
      <section className="min-h-screen bg-slateGray dark:bg-gray-900 py-20 px-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-10">
            {/* Badge */}
            <div className="flex gap-2 items-center justify-center mb-6">
              <Icon
                icon="solar:shield-check-linear"
                className="text-primary text-2xl"
              />
              <p className="text-primary text-base font-semibold">
                Confirmación de Identidad (Modo Manual)
              </p>
            </div>

            <h1 className="text-3xl font-bold text-midnight_text dark:text-white mb-3 text-center">
              Confirmar Fecha de Nacimiento
            </h1>
            <p className="text-dark_grey dark:text-gray-300 text-center mb-8">
              Introdujiste la cédula{" "}
              <strong className="text-midnight_text dark:text-white">
                {cedula}
              </strong>
              . Ingresa tu fecha de nacimiento para verificar tu identidad y
              mostrar tu nombre.
            </p>

            <form onSubmit={handleBirthDateConfirmation}>
              <div className="mb-8">
                <label
                  htmlFor="birthDate"
                  className="block text-sm font-semibold text-midnight_text dark:text-white mb-3"
                >
                  Fecha de Nacimiento
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Icon
                      icon="solar:calendar-linear"
                      className="text-dark_grey dark:text-gray-400 w-6 h-6"
                    />
                  </div>
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
                    className="w-full pl-14 pr-4 py-4 border-2 border-gray-200 dark:border-gray-600 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all text-midnight_text dark:text-white bg-white dark:bg-gray-700 font-medium text-lg shadow-lg placeholder:text-gray-400 dark:placeholder:text-gray-500"
                    style={{ boxShadow: "0 4px 15px rgba(0, 0, 0, 0.08)" }}
                    required
                    maxLength={10}
                  />
                </div>
                <p className="mt-3 text-sm text-dark_grey dark:text-gray-300 flex items-center gap-2">
                  <Icon icon="solar:info-circle-linear" className="w-4 h-4" />
                  Ingrese su fecha de nacimiento en formato DD/MM/YYYY para
                  continuar
                </p>
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-5 px-6 rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl text-lg mb-4"
              >
                Confirmar y Continuar
                <Icon
                  icon="solar:check-circle-linear"
                  className="w-6 h-6 inline-block ml-2"
                />
              </button>

              <button
                onClick={() => {
                  dispatchFlow({ type: "BACK_TO_CEDULA" });
                  setBirthDateInput("");
                }}
                type="button"
                className="w-full bg-slateGray dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-midnight_text dark:text-white font-semibold py-5 px-6 rounded-full transition-all duration-300"
              >
                Cambiar Cédula
              </button>
            </form>
          </div>
        </div>
      </section>
    );
  }

  // PASO 2: Selección de método de validación (Biométrica vs Presencial/Manual)
  if (flow.step === "metodo") {
    return (
      <section className="min-h-screen bg-slateGray dark:bg-gray-900 py-16 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-8 sm:p-10 border border-gray-100 dark:border-gray-700">
            {/* Indicador de pasos */}
            <div className="flex items-center justify-center gap-2 mb-6 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                <Icon icon="solar:check-circle-bold" className="w-4 h-4" />
                <span>Cédula</span>
              </span>
              <div className="w-6 h-0.5 bg-primary" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-white">
                <span>2</span>
                <span>Validación</span>
              </span>
              <div className="w-6 h-0.5 bg-gray-200 dark:bg-gray-700" />
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                <span>3</span>
                <span>Datos</span>
              </span>
            </div>

            <div className="flex gap-2 items-center justify-center mb-3">
              <Icon
                icon="solar:user-check-rounded-bold"
                className="text-primary text-2xl"
              />
              <p className="text-primary text-sm font-semibold tracking-wide">
                Paso 2: Elija Cómo Validar su Identidad
              </p>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-midnight_text dark:text-white mb-2 text-center">
              Participante Identificado
            </h1>
            {capacitacion && (
              <p className="text-dark_grey dark:text-gray-300 text-center mb-6 text-base font-medium">
                {capacitacion.nombre}
              </p>
            )}

            {/* Resumen de datos obtenidos del Tribunal Electoral */}
            {estudianteData && (
              <div className="bg-slate-50 dark:bg-gray-900/60 border border-gray-200 dark:border-gray-700 rounded-2xl p-4 sm:p-5 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary flex-shrink-0">
                    <Icon icon="solar:user-id-bold" className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Datos del Tribunal Electoral • Cédula{" "}
                      <span className="text-midnight_text dark:text-white font-bold">
                        {estudianteData.cedula}
                      </span>
                    </p>
                    <p className="text-base sm:text-lg font-bold text-midnight_text dark:text-white">
                      {estudianteData.nombre_cedula ||
                        `${estudianteData.nombres} ${estudianteData.apellidos}`}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearBiometriaResult();
                    setBiometriaResult(null);
                    setEstudianteData(null);
                    dispatchFlow({ type: "BACK_TO_CEDULA" });
                  }}
                  className="text-xs font-semibold text-primary hover:underline self-start sm:self-center"
                >
                  Cambiar cédula
                </button>
              </div>
            )}

            {/* OPCIÓN 1: VALIDACIÓN BIOMÉTRICA (RECOMENDADO) */}
            <div className="rounded-2xl p-6 mb-5 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 dark:from-emerald-950/40 dark:via-gray-800 dark:to-teal-950/30 border-2 border-emerald-500/40 dark:border-emerald-500/30 shadow-lg">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/20 dark:bg-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                    <Icon icon="solar:camera-square-bold" className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                        Opción 1: Validación Biométrica Facial
                      </h2>
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white rounded-full">
                        Recomendado • Inmediato
                      </span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">
                      Tribunal Electoral • INADEH
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
                Confirme su identidad en segundos mediante reconocimiento facial
                con su cámara. Su inscripción quedará validada de forma
                automática sin requerir revisión presencial previa.
              </p>

              <button
                type="button"
                onClick={handleIniciarBiometria}
                disabled={isInitiatingBiometria}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-75 text-white font-bold py-4 px-6 rounded-full transition-all duration-300 shadow-lg hover:shadow-emerald-600/25 flex items-center justify-center gap-2 text-base group"
              >
                {isInitiatingBiometria ? (
                  <>
                    <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    <span>Conectando con Tribunal Electoral...</span>
                  </>
                ) : (
                  <>
                    <Icon
                      icon="solar:verified-check-bold"
                      className="w-5 h-5 group-hover:scale-110 transition-transform"
                    />
                    <span>Realizar Validación Biométrica</span>
                    <Icon
                      icon="solar:arrow-right-linear"
                      className="w-5 h-5 group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </button>
            </div>

            {/* OPCIÓN 2: VALIDACIÓN PRESENCIAL O MANUAL */}
            <div className="rounded-2xl p-6 bg-amber-50/70 dark:bg-amber-950/20 border-2 border-amber-300/70 dark:border-amber-700/50">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-amber-500/20 dark:bg-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 flex-shrink-0">
                    <Icon
                      icon="solar:user-hand-up-bold"
                      className="w-6 h-6"
                    />
                  </div>
                  <div>
                    <div className="flex items-center flex-wrap gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                        Opción 2: Validación Presencial o Manual
                      </h2>
                      <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-amber-500 text-white rounded-full">
                        Estado: Pendiente de Validación
                      </span>
                    </div>
                    <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                      Sujeto a revisión por un administrador
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-600 dark:text-gray-300 mb-5 leading-relaxed">
                Si no dispone de cámara o prefiere validar su identidad de
                manera presencial/manual, puede completar sus datos ahora. Su
                inscripción quedará marcada como{" "}
                <strong className="text-amber-800 dark:text-amber-300">
                  &ldquo;Pendiente de validación&rdquo;
                </strong>{" "}
                hasta que un administrador la valide.
              </p>

              <button
                type="button"
                onClick={handleSeleccionarManual}
                className="w-full bg-white dark:bg-gray-800 hover:bg-amber-100/60 dark:hover:bg-gray-700 text-amber-900 dark:text-amber-200 border-2 border-amber-400 dark:border-amber-600 font-bold py-3.5 px-6 rounded-full transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Icon icon="solar:document-text-bold" className="w-5 h-5" />
                <span>Continuar con Validación Manual / Presencial</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Formulario completo (Paso 3)
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
          disabled: true, // Bloqueado - viene del API
        },
        {
          name: "apellidos",
          label: "Apellidos",
          type: "text",
          required: true,
          disabled: true, // Bloqueado - viene del API
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
    <section className="min-h-screen bg-slateGray dark:bg-gray-900 py-20">
      {/* Mensaje de error de correo */}
      {emailError && (
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-200 dark:border-red-700 rounded-2xl p-6 shadow-lg">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-500 dark:bg-red-600 flex items-center justify-center flex-shrink-0">
                <Icon
                  icon="solar:danger-circle-linear"
                  className="w-6 h-6 text-white"
                />
              </div>
              <div>
                <h3 className="text-red-900 dark:text-red-300 font-bold text-lg mb-1">
                  Error de Validación
                </h3>
                <p className="text-red-800 dark:text-red-400 font-medium">
                  {emailError}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje de verificación de correo */}
      {isCheckingEmail && (
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-4">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary/20 border-t-primary"></div>
              <p className="text-midnight_text dark:text-white font-medium">
                Verificando disponibilidad del correo...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Verificación Biométrica si está activo */}
      {metodoValidacion === "biometrica" && biometriaResult ? (
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-gray-800 dark:to-teal-950/30 border-2 border-emerald-500/40 dark:border-emerald-600/40 rounded-2xl p-5 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-500/20 dark:bg-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                  <Icon icon="solar:verified-check-bold" className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-emerald-900 dark:text-emerald-200 font-bold text-base sm:text-lg">
                      Identidad Certificada Biométricamente
                    </h3>
                    <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-600 text-white rounded-full">
                      {biometriaResult.estado}
                    </span>
                  </div>
                  <p className="text-emerald-800/80 dark:text-emerald-300/80 text-xs sm:text-sm font-medium mt-0.5">
                    Cédula:{" "}
                    <strong className="text-emerald-950 dark:text-emerald-100">
                      {biometriaResult.cedula}
                    </strong>
                    {biometriaResult.id_auditoria && (
                      <span className="hidden sm:inline">
                        {" "}
                        • ID Auditoría:{" "}
                        <code className="font-mono text-[11px] bg-emerald-100/70 dark:bg-emerald-900/60 px-1.5 py-0.5 rounded">
                          {biometriaResult.id_auditoria.slice(0, 8)}...
                        </code>
                      </span>
                    )}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  clearBiometriaResult();
                  setBiometriaResult(null);
                  dispatchFlow({ type: "BACK_TO_METODO" });
                }}
                className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 underline font-medium"
              >
                Cambiar método
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/60 rounded-2xl p-5 shadow-md">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/20 dark:bg-amber-500/30 flex items-center justify-center text-amber-700 dark:text-amber-400 flex-shrink-0">
                  <Icon icon="solar:clock-circle-bold" className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center flex-wrap gap-2">
                    <h3 className="text-amber-950 dark:text-amber-200 font-bold text-base sm:text-lg">
                      Validación Presencial / Manual Seleccionada
                    </h3>
                    <span className="px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500 text-white rounded-full">
                      Pendiente de Validación
                    </span>
                  </div>
                  <p className="text-amber-900/80 dark:text-amber-300/80 text-xs sm:text-sm font-medium mt-1">
                    Titular verificado:{" "}
                    <strong>
                      {estudianteData?.nombre_cedula ||
                        `${estudianteData?.nombres || ""} ${estudianteData?.apellidos || ""}`.trim()}
                    </strong>{" "}
                    &middot; Cédula:{" "}
                    <strong>{estudianteData?.cedula || cedula}</strong>. Al
                    completar su registro, su inscripción quedará en estado{" "}
                    <strong>&ldquo;Pendiente de validación&rdquo;</strong> hasta
                    que un administrador la valide.
                  </p>
                </div>
              </div>

              {biometriaEnabled && (
                <button
                  type="button"
                  onClick={() => dispatchFlow({ type: "BACK_TO_METODO" })}
                  className="text-xs text-amber-800 dark:text-amber-300 hover:text-emerald-700 dark:hover:text-emerald-400 underline font-semibold whitespace-nowrap"
                >
                  Cambiar a validación biométrica
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Formulario */}
      <Form
        key={formKey}
        title={`Inscripción: ${capacitacion?.nombre || "Cargando..."}`}
        fields={formFields}
        onSubmit={handleSubmit}
        submitLabel="Completar Inscripción"
        initialValues={getInitialValues()}
        isSubmitting={isSubmitting}
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
      >
        <PrivacyConsentCheckbox
          id="inscripcion-privacidad"
          checked={aceptoPolitica}
          onChange={setAceptoPolitica}
          disabled={isSubmitting}
          purpose="para gestionar mi inscripción, verificar mi correo electrónico, validar mi identidad y recibir notificaciones relacionadas con esta capacitación"
        />
      </Form>
    </section>
  );
}
