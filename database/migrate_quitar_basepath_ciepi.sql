-- Migración: el sitio pasa de https://<dominio>/ciepi a https://ciepi.inadeh.edu.pa
-- (NEXT_PUBLIC_BASE_PATH vacío).
--
-- Antes, /api/upload guardaba la URL CON el basePath ("/ciepi/uploads/blogs/x.png").
-- Ahora se guarda sin prefijo ("/uploads/blogs/x.png") y el prefijo vigente se agrega
-- al mostrar (assetUrl en lib/basePath.ts). Este script quita el prefijo heredado.
--
-- Es idempotente: ejecutarlo dos veces no cambia nada la segunda vez.
-- Ejecutar en cada base de datos (desarrollo y producción) ANTES o junto con el despliegue.

BEGIN;

-- Vista previa de lo que se va a cambiar
SELECT id, imagen_banner AS antes,
       regexp_replace(imagen_banner, '^/ciepi/', '/') AS despues
FROM ciepi.blogs
WHERE imagen_banner LIKE '/ciepi/%';

UPDATE ciepi.blogs
SET imagen_banner = regexp_replace(imagen_banner, '^/ciepi/', '/')
WHERE imagen_banner LIKE '/ciepi/%';

COMMIT;
