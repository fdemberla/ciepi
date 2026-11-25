import Link from "next/link";
import { Icon } from "@iconify/react";
import { assetUrl } from "@/lib/basePath";

export interface NewsCardProps {
  id: number | string;
  titulo: string;
  imagen_banner: string | null;
  creado_en: string;
  autor_nombre?: string | null;
  contenido_preview?: string | null;
}

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString("es-PA", { day: "numeric", month: "long", year: "numeric" });

/** Tarjeta de noticia (blog): imagen, título azul, autor y fecha, extracto y "Leer más". */
export default function NewsCard({ id, titulo, imagen_banner, creado_en, autor_nombre, contenido_preview }: NewsCardProps) {
  const href = `/blog/${id}`;
  return (
    <article className="group flex flex-col bg-white dark:bg-gray-800 rounded-2xl border border-gray-200/80 dark:border-gray-700 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 overflow-hidden h-full">
      <Link href={href} tabIndex={-1} aria-hidden="true" className="block relative aspect-[16/10] bg-surface-tint dark:bg-gray-700 overflow-hidden">
        {imagen_banner ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={assetUrl(imagen_banner)}
            alt=""
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <span className="flex items-center justify-center h-full">
            <Icon icon="solar:document-text-linear" className="text-5xl text-primary/40" />
          </span>
        )}
      </Link>
      <div className="flex flex-col flex-1 p-5 gap-3">
        <h3 className="text-lg font-bold leading-snug text-primary dark:text-white line-clamp-3">
          <Link href={href} className="hover:underline underline-offset-4">
            {titulo}
          </Link>
        </h3>
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-dark_grey dark:text-gray-400">
          {autor_nombre && (
            <span className="inline-flex items-center gap-1">
              <Icon icon="solar:user-linear" aria-hidden="true" />
              {autor_nombre}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Icon icon="solar:calendar-linear" aria-hidden="true" />
            <time dateTime={creado_en}>{formatDate(creado_en)}</time>
          </span>
        </p>
        {contenido_preview && (
          <p className="text-sm text-dark_grey dark:text-gray-300 leading-relaxed line-clamp-4">{contenido_preview}</p>
        )}
        <Link
          href={href}
          className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-primary dark:text-blue-300"
          aria-label={`Leer más: ${titulo}`}
        >
          Leer más
          <Icon icon="solar:arrow-right-linear" className="transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
