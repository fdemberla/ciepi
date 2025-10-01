"use client";
import React, { useState, useEffect } from "react";
import type { FormProps, FormFieldConfig, FormSection } from "./Form.types";
import SlateEditorField from "./SlateEditorField";

function validateField(field: FormFieldConfig, value: unknown) {
  if (
    field.required &&
    (value === undefined ||
      value === null ||
      value === "" ||
      (Array.isArray(value) && value.length === 0))
  ) {
    return field.errorMessage || "Este campo es obligatorio.";
  }
  // Email validation
  if (field.type === "email" && value) {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (typeof value !== "string" || !emailRegex.test(value)) {
      return field.errorMessage || "Correo electrónico inválido.";
    }
  }
  // Phone validation (Panamanian format: 666-6666 or 6666-6666)
  if (field.type === "tel" && value) {
    const phoneRegex = /^(\d{3}-\d{4}|\d{4}-\d{4})$/;
    if (typeof value !== "string" || !phoneRegex.test(value)) {
      return (
        field.errorMessage ||
        "Número de teléfono inválido. Use el formato: 666-6666 o 6666-6666"
      );
    }
  }
  if (typeof field.regex === "string" && typeof value === "string") {
    const regex = new RegExp(field.regex);
    if (!regex.test(value)) {
      return field.errorMessage || "Formato inválido.";
    }
  }
  return "";
}

declare global {
  interface Window {
    grecaptcha?: {
      execute: (
        siteKey: string,
        options: { action: string }
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

  // Update form data when initialValues change
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setFormData(initialValues);
    }
  }, [initialValues]);

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
  };

  // Async handleSubmit to support reCAPTCHA
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;
    const newErrors: Record<string, string> = {};

    fields.forEach((field) => {
      // Only validate actual fields, not sections
      if (
        (field as FormFieldConfig).type &&
        (field as FormFieldConfig).type !== "section"
      ) {
        const error = validateField(
          field as FormFieldConfig,
          formData[(field as FormFieldConfig).name]
        );
        if (error) {
          valid = false;
          newErrors[(field as FormFieldConfig).name] = error;
        }
      }
    });

    setErrors(newErrors);
    setCaptchaError("");
    if (!valid) return;

    // Process form data before submission
    const processedData = { ...formData };

    if (requireCaptcha && resolvedSiteKey) {
      if (!window.grecaptcha || !window.grecaptcha.execute) {
        setCaptchaError(
          "No se pudo cargar reCAPTCHA. Intenta de nuevo más tarde."
        );
        return;
      }
      try {
        const token = await window.grecaptcha.execute(resolvedSiteKey, {
          action: "submit",
        });
        if (!token) {
          setCaptchaError("No se pudo validar reCAPTCHA. Intenta de nuevo.");
          return;
        }
        onSubmit({ ...processedData, recaptchaToken: token });
      } catch {
        setCaptchaError("Error al validar reCAPTCHA. Intenta de nuevo.");
      }
    } else {
      onSubmit(processedData);
    }
  };

  // Recursive render function for fields and sections
  function renderFields(
    fieldsArr: (FormFieldConfig | FormSection)[],
    parentKey = ""
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
            className={`${section.className || ""} mb-6`}
          >
            <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
              {section.label}
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 sm:gap-6">
              {renderFields(section.fields, parentKey + section.name + "-")}
            </div>
          </div>
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
              className="grid grid-cols-1 sm:grid-cols-2 gap-4"
            >
              {rowFields.map((rf) => (
                <div key={rf.name} className={`${rf.width || ""}`}>
                  <label
                    htmlFor={rf.name}
                    className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
                  >
                    {rf.label}
                    {rf.required && (
                      <span className="text-red-500 ml-1">*</span>
                    )}
                  </label>
                  {renderFieldInput(rf)}
                  {errors[rf.name] && (
                    <span className="text-red-500 text-sm mt-1 block">
                      {errors[rf.name]}
                    </span>
                  )}
                </div>
              ))}
            </div>
          );
          i += rowFields.length;
        } else {
          // Render single field in its own row
          rendered.push(
            <div key={parentKey + f.name} className="sm:col-span-2">
              <label
                htmlFor={f.name}
                className="block mb-2 text-sm font-medium text-gray-900 dark:text-white"
              >
                {f.label}
                {f.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {renderFieldInput(f)}
              {errors[f.name] && (
                <span className="text-red-500 text-sm mt-1 block">
                  {errors[f.name]}
                </span>
              )}
            </div>
          );
          i++;
        }
      }
    }
    return rendered;
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
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
            value={formData[f.name] || ""}
            onChange={(e) => handleChange(f.name, e.target.value)}
            required={f.required}
            disabled={f.disabled}
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
            className="block p-2.5 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
            value={formData[f.name] || ""}
            onChange={(e) => handleChange(f.name, e.target.value)}
            required={f.required}
            disabled={f.disabled}
            rows={4}
          />
        );

      case "textarea-slate":
        return (
          <SlateEditorField
            id={f.name}
            name={f.name}
            value={formData[f.name] || undefined}
            onChange={(val) => handleChange(f.name, val)}
            required={f.required}
          />
        );

      case "date":
        return (
          <div className="relative">
            <input
              id={f.name}
              name={f.name}
              type="date"
              className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full pl-10 p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
              value={formData[f.name] || ""}
              onChange={(e) => handleChange(f.name, e.target.value)}
              required={f.required}
              disabled={f.disabled}
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500">
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
            className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed dark:disabled:bg-gray-800"
            value={formData[f.name] || ""}
            onChange={(e) => handleChange(f.name, e.target.value)}
            required={f.required}
            disabled={f.disabled || loadingOptions[f.name]}
          >
            <option value="">Seleccione...</option>
            {normalizedOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case "file":
        return (
          <div
            className="w-full flex flex-col items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg py-8 px-4 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-pointer transition-all hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-h-[120px] sm:min-h-[140px]"
            onClick={() =>
              document.getElementById(`file-input-${f.name}`)?.click()
            }
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleFileChange(f.name, e.dataTransfer.files);
            }}
            tabIndex={0}
            role="button"
            aria-label="Subir archivos"
          >
            <input
              id={`file-input-${f.name}`}
              name={f.name}
              type="file"
              className="hidden"
              onChange={(e) => handleFileChange(f.name, e.target.files)}
              multiple={f.multiple}
              accept={f.accept}
            />
            <div className="flex flex-col items-center pointer-events-none select-none text-center">
              <svg
                className="w-8 h-8 sm:w-10 sm:h-10 mb-3 text-gray-400 dark:text-gray-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 16V4m0 0l-4 4m4-4l4 4M20.25 16.5v2.25A2.25 2.25 0 0118 21H6a2.25 2.25 0 01-2.25-2.25V16.5"
                />
              </svg>
              <span className="text-sm sm:text-base px-2">
                {f.dropzoneText ||
                  "Arrastra y suelta archivos aquí o toca para seleccionar"}
              </span>
            </div>
            {formData[f.name] && formData[f.name].length > 0 && (
              <div className="mt-3 text-xs sm:text-sm text-gray-700 dark:text-gray-300 w-full text-center px-2">
                {formData[f.name].map((file: File) => file.name).join(", ")}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  }

  return (
    <section className="bg-white dark:bg-gray-900 min-h-screen">
      <div className="max-w-2xl px-4 py-8 mx-auto lg:py-16">
        <div className="bg-white dark:bg-gray-900">
          {title && (
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-white">
              {title}
            </h2>
          )}
          <form className={`${className}`} onSubmit={handleSubmit}>
            <div className="grid gap-4 mb-4 sm:gap-6 sm:mb-5">
              {renderFields(fields)}
            </div>
            {captchaError && (
              <div className="text-red-500 text-center text-sm mb-4">
                {captchaError}
              </div>
            )}
            <div className="flex items-center space-x-4">
              <button
                type="submit"
                className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
              >
                {submitLabel}
              </button>
              <button
                type="button"
                className="text-gray-600 inline-flex items-center hover:text-white border border-gray-600 hover:bg-gray-600 focus:ring-4 focus:outline-none focus:ring-gray-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center dark:border-gray-500 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-600 dark:focus:ring-gray-900"
                onClick={() => window.history.back()}
              >
                <svg
                  className="w-5 h-5 mr-1 -ml-1"
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
