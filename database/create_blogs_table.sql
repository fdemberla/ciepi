-- Tabla de blogs con gestión de estados
CREATE TABLE ciepi.blogs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo VARCHAR(255) NOT NULL,
    contenido JSONB NOT NULL,
    imagen_banner TEXT,
    palabras_clave JSONB DEFAULT '[]'::jsonb,
    creado_por UUID NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    estado INTEGER NOT NULL DEFAULT 1,
    aprobado_por UUID,
    aprobado_en TIMESTAMP WITH TIME ZONE,
    historial_estados JSONB DEFAULT '[]'::jsonb,
    
    -- Índices para mejorar el rendimiento
    CONSTRAINT chk_estado CHECK (estado BETWEEN 1 AND 6)
);

-- Índices para búsquedas frecuentes
CREATE INDEX idx_blogs_creado_por ON ciepi.blogs(creado_por);
CREATE INDEX idx_blogs_estado ON ciepi.blogs(estado);
CREATE INDEX idx_blogs_creado_en ON ciepi.blogs(creado_en DESC);
CREATE INDEX idx_blogs_aprobado_por ON ciepi.blogs(aprobado_por);
CREATE INDEX idx_blogs_palabras_clave ON ciepi.blogs USING GIN (palabras_clave);

-- Variable temporal para almacenar comentarios en cambios de estado
CREATE TABLE IF NOT EXISTS ciepi.temp_blog_comentarios (
    blog_id UUID,
    comentario TEXT,
    session_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Función para establecer comentario antes de actualizar estado
CREATE OR REPLACE FUNCTION ciepi.set_comentario_estado(
    p_blog_id UUID,
    p_comentario TEXT
)
RETURNS void AS $$
BEGIN
    DELETE FROM temp_blog_comentarios
    WHERE blog_id = p_blog_id;

    INSERT INTO temp_blog_comentarios (blog_id, comentario, session_id)
    VALUES (p_blog_id, p_comentario, current_setting('application_name', true));
END;
$$ LANGUAGE plpgsql;


-- Función para actualizar el historial de estados automáticamente
CREATE OR REPLACE FUNCTION ciepi.actualizar_historial_estados()
RETURNS TRIGGER AS $$
DECLARE
    v_comentario TEXT;
BEGIN
    -- Solo actualizar si el estado cambió
    IF (TG_OP = 'UPDATE' AND OLD.estado != NEW.estado) OR TG_OP = 'INSERT' THEN
        -- Obtener comentario temporal si existe
        SELECT comentario INTO v_comentario
        FROM temp_blog_comentarios
        WHERE blog_id = NEW.id
        LIMIT 1;
        
        NEW.historial_estados = NEW.historial_estados || jsonb_build_object(
            'estado', NEW.estado,
            'fecha', CURRENT_TIMESTAMP,
            'cambiado_por', NEW.aprobado_por,
            'comentario', COALESCE(v_comentario, ''),
            'estado_nombre', CASE NEW.estado
                WHEN 1 THEN 'Borrador'
                WHEN 2 THEN 'En Revisión CIEPI'
                WHEN 3 THEN 'Rechazado por CIEPI'
                WHEN 4 THEN 'En Revisión Relaciones Públicas'
                WHEN 5 THEN 'Rechazado por Relaciones Públicas'
                WHEN 6 THEN 'Publicado'
            END
        );
        
        -- Limpiar comentario temporal
        DELETE FROM ciepi.temp_blog_comentarios WHERE blog_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente el historial
CREATE TRIGGER trg_actualizar_historial_estados
    BEFORE INSERT OR UPDATE ON ciepi.blogs
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_historial_estados();