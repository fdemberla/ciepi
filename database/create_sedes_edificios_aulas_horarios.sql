-- Migración: Sedes parametrizables, Edificios, Aulas y Horarios estructurados

ALTER TABLE ciepi.sedes
    ADD COLUMN IF NOT EXISTS codigo VARCHAR(30),
    ADD COLUMN IF NOT EXISTS direccion TEXT,
    ADD COLUMN IF NOT EXISTS telefono VARCHAR(50),
    ADD COLUMN IF NOT EXISTS fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE TABLE IF NOT EXISTS ciepi.edificios (
    id SERIAL PRIMARY KEY,
    sede_id INTEGER NOT NULL REFERENCES ciepi.sedes(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL,
    codigo VARCHAR(30),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_edificio_sede_nombre UNIQUE (sede_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_edificios_sede_id ON ciepi.edificios (sede_id);

CREATE TABLE IF NOT EXISTS ciepi.aulas (
    id SERIAL PRIMARY KEY,
    edificio_id INTEGER NOT NULL REFERENCES ciepi.edificios(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    capacidad INTEGER,
    tipo VARCHAR(30) NOT NULL DEFAULT 'aula',
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_aula_tipo CHECK (tipo IN ('aula', 'laboratorio', 'auditorio', 'taller', 'virtual')),
    CONSTRAINT uq_aula_edificio_nombre UNIQUE (edificio_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_aulas_edificio_id ON ciepi.aulas (edificio_id);

ALTER TABLE ciepi.capacitaciones
    ADD COLUMN IF NOT EXISTS sede_id INTEGER REFERENCES ciepi.sedes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS edificio_id INTEGER REFERENCES ciepi.edificios(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS aula_id INTEGER REFERENCES ciepi.aulas(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS ciepi.capacitacion_horarios (
    id SERIAL PRIMARY KEY,
    capacitacion_id INTEGER NOT NULL REFERENCES ciepi.capacitaciones(id) ON DELETE CASCADE,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    CONSTRAINT chk_horario_rango CHECK (hora_fin > hora_inicio)
);

CREATE INDEX IF NOT EXISTS idx_capacitacion_horarios_cap_id
    ON ciepi.capacitacion_horarios (capacitacion_id);
