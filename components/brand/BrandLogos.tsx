import { withBasePath } from "@/lib/basePath";

interface BrandLogosProps {
  /**
   * "light": sobre fondo blanco; en modo oscuro cambia sola a la versión
   * blanca, porque la cabecera y el pie pasan a gris oscuro.
   * "dark": siempre en blanco, sobre el azul oficial o una foto oscura.
   */
  variant?: "light" | "dark";
  /** Altura del logotipo INADEH en píxeles. */
  height?: number;
  /** Muestra el nombre completo de CIEPI bajo la sigla. */
  showFullName?: boolean;
  /** Clases de visibilidad del nombre completo (por defecto, desde pantallas pequeñas). */
  fullNameClassName?: string;
}

/**
 * Dupla de marca INADEH | CIEPI.
 *
 * El logotipo INADEH es el horizontal oficial (Manual de Identidad Corporativa,
 * p. 32 y 35), sin alterar colores ni proporciones, con su área de protección
 * respetada por el separador. Sobre fondos oscuros se usa la versión blanca
 * oficial (inadeh-horizontal-blanco.png), nunca la de color.
 *
 * CIEPI se muestra como texto mientras no exista su logotipo oficial en vector:
 * cuando CIEPI lo entregue, reemplazar el bloque marcado abajo por la imagen.
 */
export default function BrandLogos({
  variant = "light",
  height = 34,
  showFullName = true,
  fullNameClassName = "hidden sm:block",
}: BrandLogosProps) {
  const dark = variant === "dark";
  const colorSrc = withBasePath("/brand/inadeh-horizontal.png");
  const whiteSrc = withBasePath("/brand/inadeh-horizontal-blanco.png");
  const imgStyle = { height, width: "auto" } as const;

  return (
    <span className="flex items-center" style={{ gap: height * 0.45 }}>
      {dark ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={whiteSrc}
          alt="INADEH"
          height={height}
          style={imgStyle}
          className="block"
        />
      ) : (
        <>
          {/* Modo claro: logotipo a color. Modo oscuro: versión blanca oficial. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={colorSrc}
            alt="INADEH"
            height={height}
            style={imgStyle}
            className="block dark:hidden"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={whiteSrc}
            alt="INADEH"
            height={height}
            style={imgStyle}
            className="hidden dark:block"
          />
        </>
      )}
      <span
        aria-hidden="true"
        className={dark ? "bg-white/50" : "bg-neutral dark:bg-white/50"}
        style={{ width: 1.5, height: height * 1.15 }}
      />
      {/* --- Logotipo CIEPI (provisional, en texto) --- */}
      <span className="flex flex-col justify-center leading-none">
        <span
          className={`font-[family-name:var(--font-display)] font-extrabold tracking-wide ${
            dark ? "text-white" : "text-primary dark:text-white"
          }`}
          style={{ fontSize: height * 0.82 }}
        >
          CIEPI
        </span>
        {showFullName && (
          <span
            className={`${fullNameClassName} whitespace-nowrap uppercase font-semibold tracking-wide ${
              dark ? "text-white/80" : "text-dark_grey dark:text-gray-300"
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
