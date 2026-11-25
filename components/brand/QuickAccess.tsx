import Link from "next/link";
import { Icon } from "@iconify/react";

export interface QuickAccessItem {
  href: string;
  label: string;
  icon: string;
  /** Color de la sección: azul, verde o naranja oficiales. */
  color: "primary" | "brand-green" | "secondary";
}

const COLOR: Record<QuickAccessItem["color"], string> = {
  primary: "text-primary",
  "brand-green": "text-brand-green",
  secondary: "text-secondary",
};

/** Barra de accesos rápidos: bloque azul claro con separadores, icono, texto y flecha. */
export default function QuickAccess({ items }: { items: QuickAccessItem[] }) {
  return (
    <nav
      aria-label="Accesos rápidos"
      className="bg-surface-tint dark:bg-gray-800 rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 lg:divide-x divide-primary/10"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group flex items-center gap-4 px-6 py-5 hover:bg-white/60 dark:hover:bg-gray-700/50 transition-colors first:rounded-t-2xl last:rounded-b-2xl lg:first:rounded-l-2xl lg:first:rounded-tr-none lg:last:rounded-r-2xl lg:last:rounded-bl-none"
        >
          <Icon icon={item.icon} className={`text-4xl flex-shrink-0 ${COLOR[item.color]}`} aria-hidden="true" />
          <span className="flex-1 font-semibold text-primary dark:text-white leading-tight">{item.label}</span>
          <Icon
            icon="solar:alt-arrow-right-linear"
            className="text-primary/70 dark:text-gray-300 text-lg transition-transform group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      ))}
    </nav>
  );
}
