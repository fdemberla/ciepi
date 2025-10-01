-- Crear el schema si no existe
CREATE SCHEMA IF NOT EXISTS ciepi;

-- Tabla de estudiantes
CREATE TABLE ciepi.estudiantes (
    id SERIAL PRIMARY KEY,
    cedula VARCHAR(50) UNIQUE NOT NULL,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    nombre_cedula VARCHAR(200) NOT NULL,
    estado_civil VARCHAR(50),
    fecha_nacimiento DATE,
    correo VARCHAR(100),
    telefono VARCHAR(20),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de ubicación de estudiantes
CREATE TABLE ciepi.estudiantes_ubicacion (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    provincia_id INTEGER,
    distrito_id INTEGER,
    corregimiento_id INTEGER,
    calle TEXT,
    CONSTRAINT fk_estudiante
        FOREIGN KEY (id_usuario) 
        REFERENCES ciepi.estudiantes(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- Tabla de estados de inscripciones
CREATE TABLE ciepi.inscripciones_estados (
    id INTEGER PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL,
    descripcion TEXT
);

-- Insertar los estados predefinidos
INSERT INTO ciepi.inscripciones_estados (id, nombre, descripcion) VALUES
(1, 'Nueva inscripción', 'Sin revisar'),
(2, 'Rechazado', 'Inscripción rechazada'),
(3, 'Matriculado', 'Estudiante matriculado en la capacitación'),
(4, 'Retirado', 'Retirado de la capacitación'),
(5, 'Terminó curso', 'Completó la capacitación');

-- Tabla de inscripciones
CREATE TABLE ciepi.inscripciones (
    id SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    id_capacitacion INTEGER NOT NULL,
    estado_inscripcion INTEGER NOT NULL DEFAULT 1,
    actualizado_por INTEGER,
    fecha_inscripcion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_estudiante_inscripcion
        FOREIGN KEY (id_usuario)
        REFERENCES ciepi.estudiantes(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_capacitacion
        FOREIGN KEY (id_capacitacion)
        REFERENCES ciepi.capacitaciones(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE,
    CONSTRAINT fk_estado_inscripcion
        FOREIGN KEY (estado_inscripcion)
        REFERENCES ciepi.inscripciones_estados(id)
        ON DELETE RESTRICT
        ON UPDATE CASCADE
);

-- Índices para mejorar el rendimiento
CREATE INDEX idx_estudiantes_cedula ON ciepi.estudiantes(cedula);
CREATE INDEX idx_estudiantes_ubicacion_usuario ON ciepi.estudiantes_ubicacion(id_usuario);
CREATE INDEX idx_inscripciones_usuario ON ciepi.inscripciones(id_usuario);
CREATE INDEX idx_inscripciones_capacitacion ON ciepi.inscripciones(id_capacitacion);
CREATE INDEX idx_inscripciones_estado ON ciepi.inscripciones(estado_inscripcion);

-- Trigger para actualizar fecha_actualizacion en estudiantes
CREATE OR REPLACE FUNCTION ciepi.actualizar_fecha_modificacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_estudiante
    BEFORE UPDATE ON ciepi.estudiantes
    FOR EACH ROW
    EXECUTE FUNCTION ciepi.actualizar_fecha_modificacion();

-- Trigger para actualizar fecha_ultima_actualizacion en inscripciones
CREATE TRIGGER trigger_actualizar_inscripcion
    BEFORE UPDATE ON ciepi.inscripciones
    FOR EACH ROW
    EXECUTE FUNCTION ciepi.actualizar_fecha_modificacion();

-- Comentarios en las tablas
COMMENT ON TABLE ciepi.estudiantes IS 'Tabla principal de estudiantes del CIEPI';
COMMENT ON TABLE ciepi.estudiantes_ubicacion IS 'Información de ubicación geográfica de los estudiantes';
COMMENT ON TABLE ciepi.inscripciones_estados IS 'Catálogo de estados posibles para las inscripciones';
COMMENT ON TABLE ciepi.inscripciones IS 'Registro de inscripciones de estudiantes a capacitaciones';

-- Ejemplos de consultas útiles

-- Ver todas las inscripciones con información del estudiante y capacitación
-- SELECT 
--   i.id,
--   e.cedula,
--   e.nombres,
--   e.apellidos,
--   c.nombre AS capacitacion,
--   ie.nombre AS estado,
--   i.fecha_inscripcion
-- FROM ciepi.inscripciones i
-- JOIN ciepi.estudiantes e ON i.id_usuario = e.id
-- JOIN ciepi.capacitaciones c ON i.id_capacitacion = c.id
-- JOIN ciepi.inscripciones_estados ie ON i.estado_inscripcion = ie.id
-- ORDER BY i.fecha_inscripcion DESC;

-- Ver inscripciones por capacitación
-- SELECT 
--   c.nombre AS capacitacion,
--   COUNT(i.id) AS total_inscritos,
--   COUNT(CASE WHEN i.estado_inscripcion = 3 THEN 1 END) AS matriculados,
--   COUNT(CASE WHEN i.estado_inscripcion = 5 THEN 1 END) AS completados
-- FROM ciepi.capacitaciones c
-- LEFT JOIN ciepi.inscripciones i ON c.id = i.id_capacitacion
-- GROUP BY c.id, c.nombre
-- ORDER BY total_inscritos DESC;
