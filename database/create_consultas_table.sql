-- ---------------------------------------------------------------------------
-- Tabla de consultas de contacto (script de referencia).
-- Alineado con el esquema real (ver verificar_columnas.sql) y con fase2_maquinas_estado.sql.
-- Idempotente: se puede ejecutar varias veces.
-- Requiere: ciepi.tipos_consulta, ciepi.sedes, ciepi.areas_formacion y
-- ciepi.usuarios_administradores.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS ciepi.consultas (
    id SERIAL PRIMARY KEY,

    -- Datos del contacto
    nombre VARCHAR(200) NOT NULL,
    email VARCHAR(100) NOT NULL,
    telefono VARCHAR(20) NOT NULL,

    -- Clasificación de la consulta
    tipo_consulta_id INTEGER REFERENCES ciepi.tipos_consulta(id),
    sede_id INTEGER REFERENCES ciepi.sedes(id) ON DELETE SET NULL,
    area_formacion_id INTEGER REFERENCES ciepi.areas_formacion(id),

    -- Detalles de la consulta
    curso_interes VARCHAR(200),
    comentarios TEXT NOT NULL,

    -- Última respuesta del administrador (todas quedan en ciepi.consultas_respuestas)
    respuesta TEXT,
    respondido_por INTEGER,
    fecha_respuesta TIMESTAMP,

    -- Estado de la consulta (máquina de estados: lib/estados/consulta.ts)
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_proceso', 'respondida', 'cerrada')),

    -- Metadata
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Token de reCAPTCHA
    recaptcha_token TEXT,
    recaptcha_score NUMERIC(3,2)
);

-- respondido_por guarda el id de ciepi.usuarios_administradores (no de ciepi.usuarios).
-- Mismo nombre de restricción que fase2_maquinas_estado.sql, para no duplicarla.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'ciepi.consultas'::regclass
       AND conname = 'consultas_respondido_por_admin_fkey'
  ) THEN
    ALTER TABLE ciepi.consultas
      ADD CONSTRAINT consultas_respondido_por_admin_fkey
      FOREIGN KEY (respondido_por) REFERENCES ciepi.usuarios_administradores(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_consultas_email ON ciepi.consultas(email);
CREATE INDEX IF NOT EXISTS idx_consultas_estado ON ciepi.consultas(estado);
CREATE INDEX IF NOT EXISTS idx_consultas_fecha_creacion ON ciepi.consultas(fecha_creacion DESC);
CREATE INDEX IF NOT EXISTS idx_consultas_tipo ON ciepi.consultas(tipo_consulta_id);

-- Trigger para actualizar fecha_actualizacion
CREATE OR REPLACE FUNCTION ciepi.actualizar_fecha_consulta()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_consulta ON ciepi.consultas;
CREATE TRIGGER trigger_actualizar_consulta
BEFORE UPDATE ON ciepi.consultas
FOR EACH ROW
EXECUTE FUNCTION ciepi.actualizar_fecha_consulta();

-- Comentarios de la tabla
COMMENT ON TABLE ciepi.consultas IS 'Almacena las consultas de contacto del sitio web';
COMMENT ON COLUMN ciepi.consultas.estado IS 'Estado de la consulta: pendiente, en_proceso, respondida, cerrada';
COMMENT ON COLUMN ciepi.consultas.recaptcha_score IS 'Puntaje de reCAPTCHA v3 (0.0 a 1.0)';
COMMENT ON COLUMN ciepi.consultas.respondido_por IS 'id de ciepi.usuarios_administradores que respondió por última vez';
