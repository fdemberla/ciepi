/**
 * Colores de texto del editor Slate en las páginas públicas.
 *
 * El editor siempre tiene fondo blanco, pero las páginas públicas cambian de
 * tema: un texto marcado en negro (o casi negro) desaparece en modo oscuro y uno
 * en blanco desaparece en modo claro. Esos colores se descartan para que el
 * texto use el color del tema (clases dark: del bloque).
 */

// Luminancia relativa (WCAG) por debajo de la cual el color se trata como negro
// (~#3f3f3f) y por encima de la cual se trata como blanco (~#ededed).
const LUMINANCIA_MAX_OSCURO = 0.05;
const LUMINANCIA_MIN_CLARO = 0.85;

const NOMBRES: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
};

function parseRgb(color: string): [number, number, number] | null {
  const c = color.trim().toLowerCase();
  if (NOMBRES[c]) return NOMBRES[c];

  const hex = c.match(/^#([0-9a-f]{3,8})$/);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) {
      h = h
        .slice(0, 3)
        .split("")
        .map((ch) => ch + ch)
        .join("");
    }
    if (h.length !== 6 && h.length !== 8) return null;
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }

  const rgb = c.match(
    /^rgba?\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/,
  );
  if (rgb) {
    return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  }
  return null;
}

function luminancia([r, g, b]: [number, number, number]): number {
  const canal = (v: number) => {
    const s = Math.min(255, Math.max(0, v)) / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * canal(r) + 0.7152 * canal(g) + 0.0722 * canal(b);
}

/**
 * Devuelve el color a aplicar o `undefined` si debe seguir al tema
 * (vacío, negro, blanco o casi negro / casi blanco).
 */
export function colorTextoSeguro(color: unknown): string | undefined {
  if (typeof color !== "string" || !color.trim()) return undefined;
  const rgb = parseRgb(color);
  // Formatos que no sabemos interpretar se dejan tal cual (p. ej. "red").
  if (!rgb) return color;
  const l = luminancia(rgb);
  if (l <= LUMINANCIA_MAX_OSCURO || l >= LUMINANCIA_MIN_CLARO) return undefined;
  return color;
}
