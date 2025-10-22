/**
 * Componente seguro para JSON-LD Structured Data
 * Evita XSS utilizando suppressHydrationWarning y renderizado seguro
 */

interface JsonLdProps {
  data: Record<string, unknown>;
}

export function JsonLdScript({ data }: JsonLdProps) {
  // Crear el string JSON de forma segura
  const jsonString = JSON.stringify(data);

  return (
    <script
      type="application/ld+json"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: jsonString }}
    />
  );
}
