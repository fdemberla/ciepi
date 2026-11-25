import type {
  FormFieldConfig,
  FormFieldOrSection,
  FormSection,
} from "./Form.types";

/**
 * Utilidades puras de <Form>: validación, aplanado de secciones y
 * sincronización de initialValues. Separadas del componente para poder
 * probarlas sin DOM.
 */

/** Devuelve todos los campos reales, entrando en las secciones (recursivo). */
export function flattenFields(
  fields: FormFieldOrSection[],
): FormFieldConfig[] {
  const out: FormFieldConfig[] = [];
  for (const field of fields) {
    if (field.type === "section") {
      out.push(...flattenFields((field as FormSection).fields || []));
    } else {
      out.push(field as FormFieldConfig);
    }
  }
  return out;
}

/** true si el valor de un editor Slate no tiene texto (solo párrafos vacíos). */
export function isSlateEmpty(value: unknown): boolean {
  if (!Array.isArray(value) || value.length === 0) return true;
  const tieneTexto = (node: unknown): boolean => {
    if (!node || typeof node !== "object") return false;
    const n = node as { text?: unknown; children?: unknown };
    if (typeof n.text === "string") return n.text.trim() !== "";
    return Array.isArray(n.children) && n.children.some(tieneTexto);
  };
  return !value.some(tieneTexto);
}

function isEmptyValue(field: FormFieldConfig, value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (field.type === "textarea-slate") return isSlateEmpty(value);
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// Panamá: 666-6666 (fijo) o 6666-6666 (celular). Se tolera separador opcional
// (guion o espacio) y el prefijo +507 para no rechazar teléfonos ya guardados
// sin ese formato (la inscripción precarga el teléfono del estudiante).
const PHONE_REGEX = /^(\+507[\s-]?)?(\d{3}[-\s]?\d{4}|\d{4}[-\s]?\d{4})$/;

/**
 * Valida un campo. Devuelve "" si es válido o el mensaje de error.
 * `errorMessage` del campo se usa para "obligatorio" y para `regex`; los
 * formatos de correo y teléfono usan su propio mensaje porque los
 * errorMessage existentes dicen "X es obligatorio".
 */
export function validateField(field: FormFieldConfig, value: unknown): string {
  if (isEmptyValue(field, value)) {
    return field.required
      ? field.errorMessage || "Este campo es obligatorio."
      : "";
  }
  if (field.type === "email") {
    if (typeof value !== "string" || !EMAIL_REGEX.test(value.trim())) {
      return "Correo electrónico inválido.";
    }
  }
  if (field.type === "tel") {
    if (typeof value !== "string" || !PHONE_REGEX.test(value.trim())) {
      return "Número de teléfono inválido. Use el formato: 666-6666 o 6666-6666";
    }
  }
  if (typeof field.regex === "string" && typeof value === "string") {
    let regex: RegExp | null = null;
    try {
      regex = new RegExp(field.regex);
    } catch {
      regex = null;
    }
    if (regex && !regex.test(value)) {
      return field.errorMessage || "Formato inválido.";
    }
  }
  return "";
}

/**
 * Valida todos los campos (incluidos los de secciones). Los campos
 * deshabilitados se omiten: el usuario no puede corregirlos.
 */
export function validateFields(
  fields: FormFieldOrSection[],
  data: Record<string, unknown>,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of flattenFields(fields)) {
    if (field.disabled) continue;
    const error = validateField(field, data[field.name]);
    if (error) errors[field.name] = error;
  }
  return errors;
}

/**
 * Serialización estable de initialValues para saber si su CONTENIDO cambió
 * (los padres suelen pasar un objeto literal nuevo en cada render).
 * Los File se representan por nombre, tamaño y fecha.
 */
export function serializeValues(values: Record<string, unknown> | undefined) {
  if (!values) return "{}";
  try {
    return JSON.stringify(values, (_key, val: unknown) => {
      if (typeof File !== "undefined" && val instanceof File) {
        return { __file: [val.name, val.size, val.lastModified] };
      }
      if (val && typeof val === "object" && !Array.isArray(val)) {
        // Claves ordenadas para que el orden no cuente como cambio.
        const obj = val as Record<string, unknown>;
        return Object.keys(obj)
          .sort()
          .reduce<Record<string, unknown>>((acc, k) => {
            acc[k] = obj[k];
            return acc;
          }, {});
      }
      return val;
    });
  } catch {
    // No serializable (p. ej. referencias circulares): nunca resincronizar,
    // así no se pierde lo escrito.
    return "__no-serializable__";
  }
}

/**
 * Aplica unos initialValues nuevos sobre lo que ya hay en el formulario:
 * las claves que trae initialValues mandan; el resto de lo escrito se conserva.
 */
export function mergeInitialValues(
  current: Record<string, unknown>,
  initial: Record<string, unknown> | undefined,
): Record<string, unknown> {
  if (!initial || Object.keys(initial).length === 0) return current;
  return { ...current, ...initial };
}
