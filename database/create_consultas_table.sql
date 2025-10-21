-- Tabla para almacenar las consultas de contacto
CREATE TABLE IF NOT EXISTS ciepi.consultas (
    id SERIAL PRIMARY KEY,
    
    -- Datos del contacto
    nombre VARCHAR(200) NOT NULL,
    email VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,
    
    -- Clasificación de la consulta
    tipo_consulta_id INTEGER REFERENCES ciepi.tipos_consulta(id),
    sede_id INTEGER REFERENCES ciepi.sedes_formacion(id),
    area_formacion_id INTEGER REFERENCES ciepi.areas_formacion(id),
    
    -- Detalles de la consulta
    curso_interes VARCHAR(200),
    comentarios TEXT NOT NULL,
    
    -- Respuesta del administrador
    respuesta TEXT,
    respondido_por INTEGER REFERENCES ciepi.usuarios(id),
    fecha_respuesta TIMESTAMP,
    
    -- Estado de la consulta
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'respondida', 'cerrada')),
    
    -- Metadata
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Token de reCAPTCHA
    recaptcha_token TEXT,
    recaptcha_score NUMERIC(3,2)
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_consultas_email ON ciepi.consultas(email);
CREATE INDEX idx_consultas_estado ON ciepi.consultas(estado);
CREATE INDEX idx_consultas_fecha_creacion ON ciepi.consultas(fecha_creacion DESC);
CREATE INDEX idx_consultas_tipo ON ciepi.consultas(tipo_consulta_id);

-- Trigger para actualizar fecha_actualizacion
CREATE OR REPLACE FUNCTION ciepi.actualizar_fecha_consulta()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_consulta
BEFORE UPDATE ON ciepi.consultas
FOR EACH ROW
EXECUTE FUNCTION ciepi.actualizar_fecha_consulta();

-- Comentarios de la tabla
COMMENT ON TABLE ciepi.consultas IS 'Almacena las consultas de contacto del sitio web';
COMMENT ON COLUMN ciepi.consultas.estado IS 'Estado de la consulta: pendiente, en_proceso, respondida, cerrada';
COMMENT ON COLUMN ciepi.consultas.recaptcha_score IS 'Puntaje de reCAPTCHA v3 (0.0 a 1.0)';
