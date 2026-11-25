-- =============================================================================
-- Fase 1: seguridad del flujo de inscripción pública.
-- Idempotente: se puede ejecutar varias veces sin efectos secundarios.
--
--   psql -h <host> -U <usuario> -d <base> -f database/fase1_seguridad_inscripcion.sql
-- =============================================================================
BEGIN;

-- 1. Sesión de inscripción en el servidor ------------------------------------
--    Guarda la identidad verificada (cédula + fecha de nacimiento), los datos del
--    Tribunal Electoral y el resultado biométrico. El navegador solo tiene una
--    cookie httpOnly con un identificador aleatorio (aquí se guarda su hash).
CREATE TABLE IF NOT EXISTS ciepi.inscripcion_sesiones (
  id                SERIAL PRIMARY KEY,
  token_hash        VARCHAR(64)  NOT NULL UNIQUE,
  cedula            VARCHAR(30)  NOT NULL,
  id_capacitacion   INTEGER      REFERENCES ciepi.capacitaciones(id) ON DELETE CASCADE,
  estado            VARCHAR(25)  NOT NULL DEFAULT 'cedula_verificada'
                    CHECK (estado IN ('cedula_verificada', 'identidad_verificada', 'bloqueada', 'usada')),
  intentos_fecha    SMALLINT     NOT NULL DEFAULT 0,
  id_estudiante     INTEGER      REFERENCES ciepi.estudiantes(id) ON DELETE CASCADE,
  datos_persona     JSONB        NOT NULL,
  biometria         JSONB,
  ip                VARCHAR(64),
  fecha_creacion    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  fecha_expiracion  TIMESTAMPTZ  NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_insc_sesiones_ip    ON ciepi.inscripcion_sesiones (ip, fecha_creacion);
CREATE INDEX IF NOT EXISTS idx_insc_sesiones_cedula ON ciepi.inscripcion_sesiones (cedula, fecha_creacion);

-- 2. Enlace de verificación de correo con estado explícito -------------------
ALTER TABLE ciepi.verificacion_correo ADD COLUMN IF NOT EXISTS estado VARCHAR(12);
UPDATE ciepi.verificacion_correo
   SET estado = CASE
                  WHEN usado AND fecha_uso IS NOT NULL THEN 'verificado'
                  WHEN usado THEN 'invalidado'
                  ELSE 'pendiente'
                END
 WHERE estado IS NULL;
ALTER TABLE ciepi.verificacion_correo ALTER COLUMN estado SET DEFAULT 'pendiente';
ALTER TABLE ciepi.verificacion_correo ALTER COLUMN estado SET NOT NULL;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'verificacion_correo_estado_check') THEN
    ALTER TABLE ciepi.verificacion_correo
      ADD CONSTRAINT verificacion_correo_estado_check
      CHECK (estado IN ('pendiente', 'verificado', 'invalidado'));
  END IF;
END $$;

-- Identificador de la página de espera (distinto del enlace del correo).
ALTER TABLE ciepi.verificacion_correo ADD COLUMN IF NOT EXISTS consulta_hash VARCHAR(64);
CREATE UNIQUE INDEX IF NOT EXISTS uq_verificacion_consulta ON ciepi.verificacion_correo (consulta_hash);
ALTER TABLE ciepi.verificacion_correo ADD COLUMN IF NOT EXISTS reenvios SMALLINT NOT NULL DEFAULT 0;
-- Resultado del canje, para responder igual si se hace clic dos veces.
ALTER TABLE ciepi.verificacion_correo ADD COLUMN IF NOT EXISTS resultado JSONB;
-- Los estudiantes nuevos se crean al verificar el correo, no antes.
ALTER TABLE ciepi.verificacion_correo ALTER COLUMN id_estudiante DROP NOT NULL;
ALTER TABLE ciepi.verificacion_correo ADD COLUMN IF NOT EXISTS cedula VARCHAR(30);
-- Duplicado de verificacion_correo_token_key.
DROP INDEX IF EXISTS ciepi.idx_verificacion_token;

-- 3. Una sola inscripción por estudiante y capacitación ------------------------
--    (si este paso falla, hay duplicados: revisar con
--     SELECT id_usuario, id_capacitacion, COUNT(*) FROM ciepi.inscripciones GROUP BY 1,2 HAVING COUNT(*) > 1;)
CREATE UNIQUE INDEX IF NOT EXISTS uq_inscripciones_usuario_capacitacion
  ON ciepi.inscripciones (id_usuario, id_capacitacion);

-- 4. Estado "Pendiente de validación" con id fijo 6 ---------------------------
INSERT INTO ciepi.inscripciones_estados (id, nombre, descripcion)
VALUES (6, 'Pendiente de validación',
        'Inscripción con validación manual o presencial pendiente de revisión por un administrador')
ON CONFLICT (id) DO NOTHING;

COMMIT;
