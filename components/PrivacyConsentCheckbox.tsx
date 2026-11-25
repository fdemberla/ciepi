"use client";

import Link from "next/link";

interface PrivacyConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  purpose: string;
  disabled?: boolean;
  id?: string;
}

export default function PrivacyConsentCheckbox({
  checked,
  onChange,
  purpose,
  disabled = false,
  id = "acepto-politica-privacidad",
}: PrivacyConsentCheckboxProps) {
  return (
    <div className="mb-6 rounded-xl border border-gray-200 dark:border-gray-700 bg-slateGray/60 dark:bg-gray-900/40 p-4">
      <label
        htmlFor={id}
        className="flex items-start gap-3 text-sm text-dark_grey dark:text-gray-300 cursor-pointer select-none"
      >
        <input
          id={id}
          type="checkbox"
          required
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <span className="leading-relaxed">
          He leído y acepto la{" "}
          <Link
            href="/privacidad"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline font-semibold"
          >
            Política de Privacidad
          </Link>{" "}
          y autorizo el tratamiento de mis datos personales {purpose}, conforme
          a la Ley 81 de 2019 de Protección de Datos Personales de la República
          de Panamá.
        </span>
      </label>
    </div>
  );
}
