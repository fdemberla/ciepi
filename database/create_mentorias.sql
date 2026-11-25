-- Módulo de Reserva de Mentorías (fase 1: datos y gestión de mentores).
-- Idempotente: se puede ejecutar más de una vez.
--
-- Los mentores son profesores marcados con es_mentor = true.
-- Las horas de disponibilidad se guardan en hora local de Panamá (UTC-5, sin
-- horario de verano); las reservas, como instantes (timestamptz).

-- 1. Datos de mentor en profesores
ALTER TABLE ciepi.profesores
    ADD COLUMN IF NOT EXISTS es_mentor BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS foto VARCHAR(500),
    ADD COLUMN IF NOT EXISTS duracion_mentoria_min SMALLINT NOT NULL DEFAULT 45;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_profesores_duracion_mentoria') THEN
        ALTER TABLE ciepi.profesores
            ADD CONSTRAINT chk_profesores_duracion_mentoria
            CHECK (duracion_mentoria_min BETWEEN 15 AND 180);
    END IF;
END $$;

-- 2. Catálogo de áreas (temas) de mentoría
CREATE TABLE IF NOT EXISTS ciepi.mentoria_areas (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL UNIQUE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO ciepi.mentoria_areas (nombre) VALUES
    ('Emprendimiento'),
    ('Innovación'),
    ('Modelo de negocio'),
    ('Finanzas y financiamiento'),
    ('Marketing y ventas'),
    ('Tecnología y transformación digital'),
    ('Formalización y trámites')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Áreas que atiende cada mentor
CREATE TABLE IF NOT EXISTS ciepi.mentor_areas (
    profesor_id INTEGER NOT NULL REFERENCES ciepi.profesores(id) ON DELETE CASCADE,
    area_id INTEGER NOT NULL REFERENCES ciepi.mentoria_areas(id) ON DELETE CASCADE,
    PRIMARY KEY (profesor_id, area_id)
);

-- 4. Horario semanal de cada mentor (hora local de Panamá)
CREATE TABLE IF NOT EXISTS ciepi.mentor_disponibilidad (
    id SERIAL PRIMARY KEY,
    profesor_id INTEGER NOT NULL REFERENCES ciepi.profesores(id) ON DELETE CASCADE,
    dia_semana SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6), -- 0 = domingo
    hora_inicio TIME NOT NULL,
    hora_fin TIME NOT NULL,
    modalidad VARCHAR(20) NOT NULL CHECK (modalidad IN ('presencial', 'virtual')),
    sede_id INTEGER REFERENCES ciepi.sedes(id) ON DELETE SET NULL,
    aula_id INTEGER REFERENCES ciepi.aulas(id) ON DELETE SET NULL,
    vigente_desde DATE,
    vigente_hasta DATE,
    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_mentor_disp_horas CHECK (hora_fin > hora_inicio),
    CONSTRAINT chk_mentor_disp_vigencia CHECK (
        vigente_desde IS NULL OR vigente_hasta IS NULL OR vigente_hasta >= vigente_desde
    )
);

CREATE INDEX IF NOT EXISTS idx_mentor_disponibilidad_profesor
    ON ciepi.mentor_disponibilidad (profesor_id);

-- 5. Fechas en que el mentor no atiende (vacaciones, licencias)
CREATE TABLE IF NOT EXISTS ciepi.mentor_bloqueos (
    id SERIAL PRIMARY KEY,
    profesor_id INTEGER NOT NULL REFERENCES ciepi.profesores(id) ON DELETE CASCADE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    motivo VARCHAR(200),
    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_mentor_bloqueo_fechas CHECK (fecha_fin >= fecha_inicio)
);

CREATE INDEX IF NOT EXISTS idx_mentor_bloqueos_profesor
    ON ciepi.mentor_bloqueos (profesor_id, fecha_inicio);

-- 6. Reservas (las usa la fase 2; se crean ahora para cerrar el modelo)
CREATE TABLE IF NOT EXISTS ciepi.mentoria_reservas (
    id SERIAL PRIMARY KEY,
    profesor_id INTEGER NOT NULL REFERENCES ciepi.profesores(id) ON DELETE RESTRICT,
    area_id INTEGER REFERENCES ciepi.mentoria_areas(id) ON DELETE SET NULL,
    inicio TIMESTAMP WITH TIME ZONE NOT NULL,
    fin TIMESTAMP WITH TIME ZONE NOT NULL,
    modalidad VARCHAR(20) NOT NULL CHECK (modalidad IN ('presencial', 'virtual')),
    sede_id INTEGER REFERENCES ciepi.sedes(id) ON DELETE SET NULL,
    aula_id INTEGER REFERENCES ciepi.aulas(id) ON DELETE SET NULL,
    nombre VARCHAR(200) NOT NULL,
    correo VARCHAR(255) NOT NULL,
    telefono VARCHAR(50),
    cedula VARCHAR(50),
    tema TEXT,
    estado VARCHAR(30) NOT NULL DEFAULT 'pendiente_verificacion' CHECK (estado IN (
        'pendiente_verificacion', 'expirada', 'confirmada', 'completada',
        'no_asistio', 'cancelada_usuario', 'cancelada_ciepi'
    )),
    pendiente_expira TIMESTAMP WITH TIME ZONE,
    enlace_reunion VARCHAR(500),
    notas_admin TEXT,
    token_gestion_hash VARCHAR(64) UNIQUE,
    consentimiento_privacidad BOOLEAN NOT NULL DEFAULT FALSE,
    consentimiento_version VARCHAR(20),
    consentimiento_fecha TIMESTAMP WITH TIME ZONE,
    fecha_creacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmada_en TIMESTAMP WITH TIME ZONE,
    cancelada_en TIMESTAMP WITH TIME ZONE,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_mentoria_reserva_horas CHECK (fin > inicio)
);

-- Un mentor no puede tener dos reservas activas que empiecen a la misma hora.
-- Lo garantiza la BD (también ante dos solicitudes simultáneas).
CREATE UNIQUE INDEX IF NOT EXISTS uq_mentoria_reserva_activa
    ON ciepi.mentoria_reservas (profesor_id, inicio)
    WHERE estado IN ('pendiente_verificacion', 'confirmada');

CREATE INDEX IF NOT EXISTS idx_mentoria_reservas_inicio
    ON ciepi.mentoria_reservas (inicio);
CREATE INDEX IF NOT EXISTS idx_mentoria_reservas_estado
    ON ciepi.mentoria_reservas (estado);

-- 7. Recordatorio 24 h antes (fase 4): marca de envío para no repetirlo
ALTER TABLE ciepi.mentoria_reservas
    ADD COLUMN IF NOT EXISTS recordatorio_enviado_en TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_mentoria_reservas_recordatorio
    ON ciepi.mentoria_reservas (inicio)
    WHERE estado = 'confirmada' AND recordatorio_enviado_en IS NULL;
