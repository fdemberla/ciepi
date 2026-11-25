"use client";
import React, { useState, useEffect, useRef } from "react";
import type { Descendant } from "slate";
import type { FormProps, FormFieldConfig, FormSection } from "./Form.types";
import SlateEditorField from "./SlateEditorField";
import {
  validateFields,
  serializeValues,
  mergeInitialValues,
} from "./Form.utils";

declare global {
  interface Window {
    grecaptcha?: {
      execute: (
        siteKey: string,
        options: { action: string },
      ) => Promise<string>;
    };
  }
}

interface FormWithCaptchaProps extends FormProps {
  siteKey?: string;
}

// Get siteKey from env if not provided as prop
const getDefaultSiteKey = () => {
  if (
    typeof process !== "undefined" &&
    process.env &&
    process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY
  ) {
    return process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  }
  return undefined;
};

const Form: React.FC<FormWithCaptchaProps> = ({
  fields,
  onSubmit,
  className = "",
  submitLabel = "Enviar",
  title,
  requireCaptcha = false,
  siteKey,
  initialValues = {},
  onFieldChange,
  isSubmitting = false,
  children,
}) => {
  const resolvedSiteKey = siteKey || getDefaultSiteKey();
  const [formData, setFormData] =
    useState<Record<string, unknown>>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loadingOptions] = useState<Record<string, boolean>>({});
  const [selectOptions] = useState<
    Record<string, Array<{ label: string; value: string }>>
  >({});
  const [captchaError, setCaptchaError] = useState<string>("");
  // Envío en curso propio de Form: bloquea el botón aunque el padre no pase
  // isSubmitting. El ref evita reentradas antes de que React vuelva a pintar.
  const [enviando, setEnviando] = useState(false);
  const enviandoRef = useRef(false);
  const ocupado = isSubmitting || enviando;

  // Sincronizar initialValues solo cuando cambia su contenido, no su referencia:
  // muchos padres pasan un objeto literal nuevo en cada render y antes eso
  // borraba lo escrito (p. ej. al fallar el envío o al recuperar el foco).
  // Se ajusta el estado durante el render (patrón recomendado por React) y se
  // fusiona con lo ya escrito en lugar de reemplazarlo.
  const initialSerialized = serializeValues(initialValues);
  const [syncedInitial, setSyncedInitial] = useState(initialSerialized);
  if (initialSerialized !== syncedInitial) {
    setSyncedInitial(initialSerialized);
    setFormData((prev) => mergeInitialValues(prev, initialValues));
  }

  // Load reCAPTCHA v3 script if needed
  useEffect(() => {
    if (requireCaptcha && resolvedSiteKey && !window.grecaptcha) {
      const scriptId = "recaptcha-v3-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.src = `https://www.google.com/recaptcha/api.js?render=${resolvedSiteKey}`;
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
    }
  }, [requireCaptcha, resolvedSiteKey]);

  // Handle field value changes
  const handleChange = (name: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
    // Call the external onChange callback if provided
    if (onFieldChange) {
      onFieldChange(name, value);
    }
  };

  // Handle file input changes
  const handleFileChange = (name: string, files: FileList | null) => {
    if (files && files.length > 0) {
      // Convert FileList to Array of File objects for easier handling
      const fileArray = Array.from(files);
      setFormData((prev) => ({ ...prev, [name]: fileArray }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: null }));
    }
    setErrors((prev) => ({ ...prev, [name]: "" }));
    if (onFieldChange) {
      onFieldChange(name, files && files.length > 0 ? Array.from(files) : null);
    }
  };

  // Lleva el foco al primer campo con error para que el lector de pantalla
  // lo anuncie (el resumen con role="alert" ya avisa del total).
  const focusFirstError = (newErrors: Record<string, string>) => {
    const firstName = Object.keys(newErrors)[0];
    if (!firstName) return;
    requestAnimationFrame(() => {
      const el = document.getElementById(firstName);
      if (el) {
        el.focus();
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    });
  };

  // Async handleSubmit to support reCAPTCHA
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Ignorar envíos repetidos mientras hay uno en curso (doble clic, Enter).
    if (enviandoRef.current || isSubmitting) return;

    // Valida también los campos dentro de secciones.
    const newErrors = validateFields(fields, formData);
    setErrors(newErrors);
    setCaptchaError("");
    if (Object.keys(newErrors).length > 0) {
      focusFirstError(newErrors);
      return;
    }

    // Process form data before submission
    const processedData = { ...formData };

    enviandoRef.current = true;
    setEnviando(true);
    try {
      if (requireCaptcha && resolvedSiteKey) {
        if (!window.grecaptcha || !window.grecaptcha.execute) {
          setCaptchaError(
            "No se pudo cargar reCAPTCHA. Intenta de nuevo más tarde.",
          );
          return;
        }
        let token: string;
        try {
          token = await window.grecaptcha.execute(resolvedSiteKey, {
            action: "submit",
          });
        } catch {
          setCaptchaError("Error al validar reCAPTCHA. Intenta de nuevo.");
          return;
        }
        if (!token) {
          setCaptchaError("No se pudo validar reCAPTCHA. Intenta de nuevo.");
          return;
        }
        await onSubmit({ ...processedData, recaptchaToken: token });
      } else {
        await onSubmit(processedData);
      }
    } catch (error) {
      // onSubmit no debería lanzar (cada página muestra su propio error);
      // se registra para no dejar una promesa rechazada sin manejar.
      console.error("Error al enviar el formulario:", error);
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  // Recursive render function for fields and sections
  function renderFields(
    fieldsArr: (FormFieldConfig | FormSection)[],
    parentKey = "",
  ): React.ReactNode[] {
    const rendered: React.ReactNode[] = [];
    let i = 0;

    while (i < fieldsArr.length) {
      const field = fieldsArr[i];
      if (field.type === "section") {
        const section = field as FormSection;
        rendered.push(
          <div
            key={parentKey + section.name}
            className={`${section.className || ""} mb-8`}
          >
            <h3 className="mb-6 text-xl font-semibold text-midnight_text dark:text-white border-l-4 border-primary pl-3 pb-1">
              {section.label}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
              {renderFields(section.fields, parentKey + section.name + "-")}
            </div>
          </div>,
        );
        i++;
      } else {
        const f = field as FormFieldConfig;
        if (f.row !== undefined) {
          // Find all fields with the same row, starting from i
          const rowNum = f.row;
          const rowFields: FormFieldConfig[] = [];
          let j = i;
          while (
            j < fieldsArr.length &&
            (fieldsArr[j] as FormFieldConfig).row === rowNum &&
            (fieldsArr[j] as FormFieldConfig).type !== "section"
          ) {
            rowFields.push(fieldsArr[j] as FormFieldConfig);
            j++;
          }
          rendered.push(
            <div
              key={parentKey + "row-" + rowNum + "-" + i}
              className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-[22px]"
            >
              {rowFields.map((rf) => (
                <div key={rf.name} className={`${rf.width || ""}`}>
                  {renderLabel(rf)}
                  {renderFieldInput(rf)}
                  {renderError(rf)}
                </div>
              ))}
            </div>,
          );
          i += rowFields.length;
        } else {
          // Render single field in its own row
          rendered.push(
            <div key={parentKey + f.name} className="sm:col-span-2 mb-[22px]">
              {renderLabel(f)}
              {renderFieldInput(f)}
              {renderError(f)}
            </div>,
          );
          i++;
        }
      }
    }
    return rendered;
  }

  // Ids para asociar etiqueta, control y mensaje de error.
  const errorId = (name: string) => `${name}-error`;
  const labelId = (name: string) => `${name}-label`;

  // Atributos ARIA comunes de los controles: estado inválido y descripción
  // (mensaje de error) para que el lector de pantalla los anuncie.
  function ariaProps(f: FormFieldConfig, extraDescribedBy?: string) {
    const hasError = Boolean(errors[f.name]);
    const describedBy = [extraDescribedBy, hasError ? errorId(f.name) : ""]
      .filter(Boolean)
      .join(" ");
    return {
      "aria-invalid": hasError || undefined,
      "aria-describedby": describedBy || undefined,
    };
  }

  function renderLabel(f: FormFieldConfig) {
    const content = (
      <>
        {f.label}
        {f.required && (
          <span className="text-secondary ml-1" aria-hidden="true">
            *
          </span>
        )}
      </>
    );
    const className =
      "block mb-2 text-base font-medium text-midnight_text dark:text-white";
    // El editor Slate es un div contenteditable: no admite <label for>, se
    // asocia con aria-labelledby desde el propio editor.
    if (f.type === "textarea-slate") {
      return (
        <span id={labelId(f.name)} className={className}>
          {content}
        </span>
      );
    }
    return (
      <label id={labelId(f.name)} htmlFor={f.name} className={className}>
        {content}
      </label>
    );
  }

  function renderError(f: FormFieldConfig) {
    if (!errors[f.name]) return null;
    return (
      <span id={errorId(f.name)} className="text-red-500 text-sm mt-1 block">
        {errors[f.name]}
      </span>
    );
  }

  // Helper function to render field inputs
  function renderFieldInput(f: FormFieldConfig) {
    switch (f.type) {
      case "text":
      case "email":
      case "tel":
      case "number":
        return (
          <input
            id={f.name}
            name={f.name}
            type={f.type}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-5 py-3 text-base text-midnight_text dark:text-white outline-none transition-colors placeholder:text-dark_grey dark:placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:shadow-none disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
            value={(formData[f.name] as string) || ""}
            onChange={(e) => handleChange(f.name, e.target.value)}
            required={f.required}
            disabled={f.disabled}
            {...ariaProps(f)}
            placeholder={
              f.type === "email"
                ? "ejemplo@correo.com"
                : f.type === "tel"
                  ? "6666-6666"
                  : undefined
            }
          />
        );

      case "textarea":
        return (
          <textarea
            id={f.name}
            name={f.name}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-5 py-3 text-base text-midnight_text dark:text-white outline-none transition-colors placeholder:text-dark_grey dark:placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:shadow-none disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
            value={(formData[f.name] as string) || ""}
            onChange={(e) => handleChange(f.name, e.target.value)}
            required={f.required}
            disabled={f.disabled}
            rows={4}
            {...ariaProps(f)}
          />
        );

      case "textarea-slate":
        return (
          <SlateEditorField
            id={f.name}
            name={f.name}
            value={(formData[f.name] as unknown as Descendant[]) || undefined}
            onChange={(val) => handleChange(f.name, val)}
            required={f.required}
            ariaLabelledBy={labelId(f.name)}
            ariaDescribedBy={errors[f.name] ? errorId(f.name) : undefined}
            ariaInvalid={Boolean(errors[f.name])}
          />
        );

      case "date":
        return (
          <div className="relative">
            <input
              id={f.name}
              name={f.name}
              type="date"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-10 pr-5 py-3 text-base text-midnight_text dark:text-white outline-none transition-colors placeholder:text-dark_grey dark:placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:shadow-none disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
              value={(formData[f.name] as string) || ""}
              onChange={(e) => handleChange(f.name, e.target.value)}
              required={f.required}
              disabled={f.disabled}
              {...ariaProps(f)}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark_grey dark:text-gray-400">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 7.5h18M4.5 21h15a1.5 1.5 0 001.5-1.5V6.75A1.5 1.5 0 0019.5 5.25h-15A1.5 1.5 0 003 6.75v12.75A1.5 1.5 0 004.5 21z"
                />
              </svg>
            </div>
          </div>
        );

      case "datetime-local":
        return (
          <div className="relative">
            <input
              id={f.name}
              name={f.name}
              type="datetime-local"
              className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 pl-10 pr-5 py-3 text-base text-midnight_text dark:text-white outline-none transition-colors placeholder:text-dark_grey dark:placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:shadow-none disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
              value={(formData[f.name] as string) || ""}
              onChange={(e) => handleChange(f.name, e.target.value)}
              required={f.required}
              disabled={f.disabled}
              {...ariaProps(f)}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark_grey dark:text-gray-400">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 7.5h18M4.5 21h15a1.5 1.5 0 001.5-1.5V6.75A1.5 1.5 0 0019.5 5.25h-15A1.5 1.5 0 003 6.75v12.75A1.5 1.5 0 004.5 21z"
                />
              </svg>
            </div>
          </div>
        );

      case "select":
        // Use selectOptions if loaded from API, otherwise use static values
        const options =
          selectOptions[f.name] && selectOptions[f.name].length > 0
            ? selectOptions[f.name]
            : f.options || f.values || [];

        // Normalize options to always be objects with label and value
        const normalizedOptions = options.map((opt) => {
          if (typeof opt === "string") {
            return { label: opt, value: opt };
          }
          return opt;
        });

        return (
          <select
            id={f.name}
            name={f.name}
            className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-5 py-3 text-base text-midnight_text dark:text-white outline-none transition-colors placeholder:text-dark_grey dark:placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus-visible:shadow-none disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
            value={(formData[f.name] as string) || ""}
            onChange={(e) => handleChange(f.name, e.target.value)}
            required={f.required}
            disabled={f.disabled || loadingOptions[f.name]}
            {...ariaProps(f)}
          >
            <option value="">Seleccione...</option>
            {normalizedOptions.map((opt, idx) => (
              <option key={`${opt.value}-${idx}`} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case "file": {
        const files = formData[f.name] as File[] | null | undefined;
        const hintId = `${f.name}-hint`;
        const filesId = `${f.name}-files`;
        const hasFiles = Array.isArray(files) && files.length > 0;
        // El <input type="file"> es el control real: visualmente oculto pero
        // enfocable, etiquetado por el label del campo y operable con teclado
        // (Enter/Espacio abren el selector). La zona visible solo reenvía el
        // clic, recibe archivos arrastrados y muestra el foco del input.
        return (
          <div>
            <input
              id={f.name}
              name={f.name}
              type="file"
              className="peer sr-only"
              onChange={(e) => handleFileChange(f.name, e.target.files)}
              multiple={f.multiple}
              accept={f.accept}
              disabled={f.disabled}
              {...ariaProps(
                f,
                [hintId, hasFiles ? filesId : ""].filter(Boolean).join(" "),
              )}
            />
            <div
              className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md py-8 px-4 bg-white dark:bg-gray-800 text-dark_grey dark:text-gray-300 cursor-pointer transition-all hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 peer-focus-visible:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-primary/20 min-h-[120px] sm:min-h-[140px]"
              onClick={() => {
                if (!f.disabled) document.getElementById(f.name)?.click();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!f.disabled) handleFileChange(f.name, e.dataTransfer.files);
              }}
            >
              <div className="flex flex-col items-center pointer-events-none select-none text-center">
                <svg
                  className="w-8 h-8 sm:w-10 sm:h-10 mb-3 text-dark_grey dark:text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16V4m0 0l-4 4m4-4l4 4M20.25 16.5v2.25A2.25 2.25 0 0118 21H6a2.25 2.25 0 01-2.25-2.25V16.5"
                  />
                </svg>
                <span
                  id={hintId}
                  className="text-sm sm:text-base px-2 text-midnight_text dark:text-white"
                >
                  {f.dropzoneText ||
                    "Arrastra y suelta archivos aquí o toca para seleccionar"}
                </span>
              </div>
              {hasFiles && (
                <div
                  id={filesId}
                  className="mt-3 text-xs sm:text-sm text-midnight_text dark:text-white w-full text-center px-2"
                >
                  {files.map((file: File) => file.name).join(", ")}
                </div>
              )}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  }

  const errorCount = Object.values(errors).filter(Boolean).length;

  return (
    <section className="w-full h-full bg-slateGray dark:bg-gray-900 flex flex-col">
      <div className="w-full h-full flex flex-col px-4 py-2 lg:py-6">
        <div className="w-full h-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8 lg:p-10 flex flex-col">
          {title && (
            <h2 className="mb-6 text-2xl font-bold text-midnight_text dark:text-white">
              {title}
            </h2>
          )}
          <form
            className={`flex flex-col flex-1 ${className}`}
            onSubmit={handleSubmit}
          >
            <div className="flex-1 mb-4">{renderFields(fields)}</div>
            {children}
            {/* Resumen de errores: role="alert" para que se anuncie al enviar. */}
            <div role="alert">
              {errorCount > 0 && (
                <p className="text-red-500 dark:text-red-400 text-center text-base mb-6">
                  {errorCount === 1
                    ? "Hay 1 campo con errores. Revísalo antes de enviar."
                    : `Hay ${errorCount} campos con errores. Revísalos antes de enviar.`}
                </p>
              )}
              {captchaError && (
                <p className="text-red-500 dark:text-red-400 text-center text-base mb-6">
                  {captchaError}
                </p>
              )}
            </div>
            <div className="mb-9">
              <button
                type="submit"
                disabled={ocupado}
                aria-busy={ocupado || undefined}
                className={`flex w-full items-center text-lg font-medium justify-center rounded-xl px-5 py-3 text-white transition duration-200 ease-in-out border-primary border ${
                  ocupado
                    ? "bg-gray-400 dark:bg-gray-600 cursor-not-allowed opacity-70"
                    : "bg-primary hover:bg-primary/90"
                }`}
              >
                {ocupado ? (
                  <>
                    <svg
                      aria-hidden="true"
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Procesando...
                  </>
                ) : (
                  submitLabel
                )}
              </button>
            </div>
            <div className="flex justify-center">
              <button
                type="button"
                className="text-midnight_text dark:text-white inline-flex items-center hover:text-primary dark:hover:text-primary border border-gray-300 dark:border-gray-600 hover:border-primary focus:outline-none font-medium rounded-xl text-base px-5 py-3 text-center transition-colors duration-200"
                onClick={() => window.history.back()}
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};

export default Form;
