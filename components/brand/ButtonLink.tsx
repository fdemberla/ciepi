import Link from "next/link";
import { Icon } from "@iconify/react";
import type { ReactNode } from "react";

type Variant = "orange" | "blue" | "green" | "outline-white" | "white";

const VARIANTS: Record<Variant, string> = {
  // El naranja oficial se reserva para las acciones principales (manual, p. 101).
  orange: "bg-secondary text-white hover:brightness-95 shadow-sm",
  blue: "bg-primary text-white hover:brightness-110 shadow-sm",
  green: "bg-brand-green text-white hover:brightness-95 shadow-sm",
  white: "bg-white text-primary hover:bg-white/90 shadow-sm",
  "outline-white": "border-2 border-white/80 text-white hover:bg-white/10",
};

interface ButtonLinkProps {
  href: string;
  children: ReactNode;
  variant?: Variant;
  className?: string;
}

/** Botón redondeado con flecha, el estilo de botón del concepto de CIEPI. */
export default function ButtonLink({ href, children, variant = "orange", className = "" }: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`group inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 font-semibold text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary ${VARIANTS[variant]} ${className}`}
    >
      {children}
      <Icon
        icon="solar:arrow-right-linear"
        className="text-lg transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
