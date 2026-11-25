/**
 * Datos estructurados JSON-LD.
 * El contenido se serializa con serializeJsonLd, que escapa `<`, `>` y `&`
 * para que un título con `</script>` no pueda cerrar el bloque e inyectar HTML.
 */
import { serializeJsonLd } from "@/lib/security";

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLdScript({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
