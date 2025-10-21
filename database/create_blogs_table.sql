-- Tabla de blogs con gestión de estados
CREATE TABLE blogs (
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

-- Comentarios para documentar los estados
COMMENT ON COLUMN blogs.estado IS 
'Estados: 
1 = Borrador
2 = En Revisión CIEPI
3 = Rechazado por CIEPI
4 = En Revisión Relaciones Públicas
5 = Rechazado por Relaciones Públicas (vuelve a CIEPI)
6 = Publicado';

-- Índices para búsquedas frecuentes
CREATE INDEX idx_blogs_creado_por ON blogs(creado_por);
CREATE INDEX idx_blogs_estado ON blogs(estado);
CREATE INDEX idx_blogs_creado_en ON blogs(creado_en DESC);
CREATE INDEX idx_blogs_aprobado_por ON blogs(aprobado_por);
CREATE INDEX idx_blogs_palabras_clave ON blogs USING GIN (palabras_clave);

-- Variable temporal para almacenar comentarios en cambios de estado
CREATE TABLE IF NOT EXISTS temp_blog_comentarios (
    blog_id UUID,
    comentario TEXT,
    session_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Función para establecer comentario antes de actualizar estado
CREATE OR REPLACE FUNCTION set_comentario_estado(p_blog_id UUID, p_comentario TEXT)
RETURNS void AS $
BEGIN
    DELETE FROM temp_blog_comentarios WHERE blog_id = p_blog_id;
    INSERT INTO temp_blog_comentarios (blog_id, comentario, session_id)
    VALUES (p_blog_id, p_comentario, current_setting('application_name', true));
END;
$ LANGUAGE plpgsql;

-- Función para actualizar el historial de estados automáticamente
CREATE OR REPLACE FUNCTION actualizar_historial_estados()
RETURNS TRIGGER AS $
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
        DELETE FROM temp_blog_comentarios WHERE blog_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$ LANGUAGE plpgsql;

-- Trigger para actualizar automáticamente el historial
CREATE TRIGGER trg_actualizar_historial_estados
    BEFORE INSERT OR UPDATE ON blogs
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_historial_estados();

-- Ejemplo de inserción
INSERT INTO blogs (titulo, contenido, imagen_banner, creado_por) 
VALUES (
    'Mi Primer Blog',
    '{"introduccion": "Este es un ejemplo", "cuerpo": "Contenido del blog..."}'::jsonb,
    'https://ejemplo.com/imagen.jpg',
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid
);

-- Ejemplo de actualización de estado con comentario (de Borrador a Revisión CIEPI)
-- SELECT set_comentario_estado(
--     'id_del_blog'::uuid,
--     'Se envía a revisión para validar contenido y formato'
-- );
-- UPDATE blogs 
-- SET estado = 2, 
--     aprobado_por = 'id_del_revisor_ciepi'::uuid
-- WHERE id = 'id_del_blog'::uuid;

-- Ejemplo de rechazo con comentario
-- SELECT set_comentario_estado(
--     'id_del_blog'::uuid,
--     'Se rechaza porque el contenido no cumple con las normas editoriales. Por favor revisar la sección de introducción.'
-- );
-- UPDATE blogs 
-- SET estado = 3, 
--     aprobado_por = 'id_del_revisor_ciepi'::uuid
-- WHERE id = 'id_del_blog'::uuid;

-- Ejemplo de inserción con palabras clave
-- INSERT INTO blogs (titulo, contenido, imagen_banner, palabras_clave, creado_por) 
-- VALUES (
--     'Innovación en Tecnología',
--     '{"introduccion": "Este es un ejemplo", "cuerpo": "Contenido del blog..."}'::jsonb,
--     'https://ejemplo.com/imagen.jpg',
--     '["tecnología", "innovación", "inteligencia artificial", "desarrollo web"]'::jsonb,
--     'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid
-- );

-- Buscar blogs por palabra clave específica
-- SELECT * FROM blogs 
-- WHERE palabras_clave @> '["tecnología"]'::jsonb;

-- Buscar blogs que contengan cualquiera de las palabras clave
-- SELECT * FROM blogs 
-- WHERE palabras_clave ?| array['tecnología', 'innovación'];

-- Buscar blogs que contengan todas las palabras clave
-- SELECT * FROM blogs 
-- WHERE palabras_clave ?& array['tecnología', 'innovación'];