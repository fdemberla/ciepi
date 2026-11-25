import { withBasePath } from "@/lib/basePath";

interface BrandLogosProps {
  /** "light": sobre fondo blanco. "dark": sobre el azul oficial o una foto oscura. */
  variant?: "light" | "dark";
  /** Altura del logotipo INADEH en píxeles. */
  height?: number;
  /** Muestra el nombre completo de CIEPI bajo la sigla. */
  showFullName?: boolean;
}

/**
 * Dupla de marca INADEH | CIEPI.
 *
 * El logotipo INADEH es el horizontal oficial (Manual de Identidad Corporativa,
 * p. 32 y 35), sin alterar colores ni proporciones, con su área de protección
 * respetada por el separador.
 *
 * CIEPI se muestra como texto mientras no exista su logotipo oficial en vector:
 * cuando CIEPI lo entregue, reemplazar el bloque marcado abajo por la imagen.
 */
export default function BrandLogos({
  variant = "light",
  height = 34,
  showFullName = true,
}: BrandLogosProps) {
  const dark = variant === "dark";
  const inadehSrc = withBasePath(
    dark ? "/brand/inadeh-horizontal-blanco.png" : "/brand/inadeh-horizontal.png",
  );

  return (
    <span className="flex items-center" style={{ gap: height * 0.45 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={inadehSrc}
        alt="INADEH"
        height={height}
        style={{ height, width: "auto" }}
        className="block"
      />
      <span
        aria-hidden="true"
        className={dark ? "bg-white/50" : "bg-neutral"}
        style={{ width: 1.5, height: height * 1.15 }}
      />
      {/* --- Logotipo CIEPI (provisional, en texto) --- */}
      <span className="flex flex-col justify-center leading-none">
        <span
          className={`font-[family-name:var(--font-display)] font-extrabold tracking-wide ${
            dark ? "text-white" : "text-primary"
          }`}
          style={{ fontSize: height * 0.82 }}
        >
          CIEPI
        </span>
        {showFullName && (
          <span
            className={`hidden sm:block uppercase font-semibold tracking-wide ${
              dark ? "text-white/80" : "text-dark_grey"
            }`}
            style={{ fontSize: Math.max(8, height * 0.24), marginTop: 2 }}
          >
            Centro de Innovación y
            <br />
            Emprendimiento Productivo
          </span>
        )}
      </span>
    </span>
  );
}
