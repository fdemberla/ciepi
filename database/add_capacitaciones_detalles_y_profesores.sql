-- Migración: horarios, modalidad, ubicación en capacitaciones y tabla de profesores

ALTER TABLE ciepi.capacitaciones
    ADD COLUMN IF NOT EXISTS horario VARCHAR(255),
    ADD COLUMN IF NOT EXISTS modalidad VARCHAR(30),
    ADD COLUMN IF NOT EXISTS sede VARCHAR(150),
    ADD COLUMN IF NOT EXISTS edificio VARCHAR(150),
    ADD COLUMN IF NOT EXISTS salon VARCHAR(100);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_capacitaciones_modalidad'
    ) THEN
        ALTER TABLE ciepi.capacitaciones
            ADD CONSTRAINT chk_capacitaciones_modalidad
            CHECK (modalidad IS NULL OR modalidad IN ('presencial', 'virtual', 'hibrida'));
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS ciepi.profesores (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    apellido VARCHAR(120) NOT NULL,
    correo VARCHAR(255) UNIQUE,
    telefono VARCHAR(50),
    especialidad VARCHAR(200),
    biografia TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ciepi.capacitacion_profesores (
    capacitacion_id INTEGER NOT NULL REFERENCES ciepi.capacitaciones(id) ON DELETE CASCADE,
    profesor_id INTEGER NOT NULL REFERENCES ciepi.profesores(id) ON DELETE CASCADE,
    rol VARCHAR(80) NOT NULL DEFAULT 'Instructor',
    fecha_asignacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (capacitacion_id, profesor_id)
);

CREATE INDEX IF NOT EXISTS idx_capacitacion_profesores_profesor
    ON ciepi.capacitacion_profesores (profesor_id);
