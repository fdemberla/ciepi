-- ---------------------------------------------------------------------------
-- Tabla de blogs (script de referencia).
-- Alineado con el esquema real (ver verificar_columnas.sql): ids INTEGER.
-- Idempotente: se puede ejecutar varias veces.
--
-- Fase 2: ya NO existe el mecanismo antiguo de comentarios de estado
-- (trigger trg_actualizar_historial_estados, ciepi.actualizar_historial_estados(),
-- ciepi.set_comentario_estado y ciepi.temp_blog_comentarios). Los cambios de estado
-- y sus motivos se registran en ciepi.estado_historial (entidad = 'blog') desde la API
-- (lib/estadosServer.ts). Ver fase2_maquinas_estado.sql.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ciepi.blogs (
    id                SERIAL PRIMARY KEY,
    titulo            VARCHAR(255) NOT NULL,
    contenido         JSONB NOT NULL,
    imagen_banner     TEXT,
    palabras_clave    JSONB DEFAULT '[]'::jsonb,
    -- id de ciepi.usuarios_administradores
    creado_por        INTEGER NOT NULL,
    creado_en         TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    -- 1 Borrador · 2 En revisión CIEPI · 3 Rechazado CIEPI · 4 En revisión RR. PP. ·
    -- 5 Rechazado RR. PP. · 6 Publicado (ver lib/estados/blog.ts)
    estado            INTEGER NOT NULL DEFAULT 1,
    -- id de ciepi.usuarios_administradores
    aprobado_por      INTEGER,
    aprobado_en       TIMESTAMP WITH TIME ZONE,
    -- Obsoleto (fase 2): ya no se escribe; se conserva por los datos antiguos.
    historial_estados JSONB DEFAULT '[]'::jsonb,

    CONSTRAINT chk_blogs_estado CHECK (estado BETWEEN 1 AND 6)
);

-- Índices para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_blogs_creado_por ON ciepi.blogs(creado_por);
CREATE INDEX IF NOT EXISTS idx_blogs_estado ON ciepi.blogs(estado);
CREATE INDEX IF NOT EXISTS idx_blogs_creado_en ON ciepi.blogs(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_blogs_aprobado_por ON ciepi.blogs(aprobado_por);
CREATE INDEX IF NOT EXISTS idx_blogs_palabras_clave ON ciepi.blogs USING GIN (palabras_clave);

COMMENT ON COLUMN ciepi.blogs.historial_estados IS
  'Obsoleto (fase 2): ya no se escribe. El historial vive en ciepi.estado_historial (entidad = ''blog'').';
