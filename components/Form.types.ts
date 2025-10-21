// types for the form field configuration

type FormFieldType =
  | "text"
  | "email"
  | "tel"
  | "textarea"
  | "textarea-slate"
  | "number"
  | "date"
  | "select"
  | "file"
  | "section";

export interface FormFieldConfig {
  name: string;
  label: string;
  type: FormFieldType;
  errorMessage?: string;
  regex?: string;
  required?: boolean;
  disabled?: boolean; // Field is read-only
  // For select fields
  values?: Array<string> | Array<{ label: string; value: string | number }>;
  options?: Array<string> | Array<{ label: string; value: string | number }>; // Alias for values
  // For file fields
  dropzoneText?: string;
  accept?: string;
  apiUrl?: string;
  // For file fields
  multiple?: boolean;
  // Layout
  width?: string; // e.g. 'w-full', 'w-1/2', 'w-1/3', etc.
  row?: number; // fields with the same row number are rendered in the same row
}

export interface FormSection {
  name: string;
  label: string;
  type: "section";
  className?: string;
  fields: (FormFieldConfig | FormSection)[];
}

export type FormFieldOrSection = FormFieldConfig | FormSection;

export interface FormProps {
  fields: FormFieldOrSection[];
  onSubmit: (data: Record<string, unknown>) => void;
  className?: string;
  submitLabel?: string;
  title?: string;
  initialValues?: Record<string, unknown>; // For editing existing data
  requireCaptcha?: boolean;
  onFieldChange?: (fieldName: string, value: unknown) => void; // Callback when field value changes
  isSubmitting?: boolean; // Indicates if form is being submitted
}
