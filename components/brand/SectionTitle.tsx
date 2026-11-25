import Link from "next/link";
import { Icon } from "@iconify/react";

interface SectionTitleProps {
  title: string;
  subtitle?: string;
  /** Enlace opcional a la derecha, p. ej. "Ver todas las noticias". */
  link?: { href: string; label: string };
  /** "light" para fondos claros; "dark" sobre el azul oficial. */
  variant?: "light" | "dark";
  as?: "h1" | "h2";
}

/** Título de sección con la barra verde corta encima, como en el concepto de CIEPI. */
export default function SectionTitle({
  title,
  subtitle,
  link,
  variant = "light",
  as: Tag = "h2",
}: SectionTitleProps) {
  const dark = variant === "dark";
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div>
        <span aria-hidden="true" className="block w-12 h-1.5 rounded-full bg-brand-green mb-3" />
        <Tag
          className={`text-3xl md:text-4xl font-bold leading-tight ${
            dark ? "text-white" : "text-primary dark:text-white"
          }`}
        >
          {title}
        </Tag>
        {subtitle && (
          <p className={`mt-2 max-w-[60ch] ${dark ? "text-white/80" : "text-dark_grey dark:text-gray-400"}`}>
            {subtitle}
          </p>
        )}
      </div>
      {link && (
        <Link
          href={link.href}
          className={`group inline-flex items-center gap-1.5 text-sm font-semibold ${
            dark ? "text-white" : "text-primary dark:text-blue-300"
          } hover:underline underline-offset-4`}
        >
          {link.label}
          <Icon
            icon="solar:arrow-right-linear"
            className="text-base transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </Link>
      )}
    </div>
  );
}
