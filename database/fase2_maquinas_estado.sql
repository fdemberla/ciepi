-- =============================================================================
-- Fase 2: máquinas de estado unificadas (historial único, inscripciones, blog,
-- consultas). Mentorías y newsletter no necesitan cambios de esquema, pero sí
-- usan ciepi.estado_historial.
-- Idempotente. Requiere fase1_seguridad_inscripcion.sql aplicado.
-- Ejecutar ANTES de desplegar el código de la fase 2:
--   psql -h <host> -U <usuario> -d <base> -f database/fase2_maquinas_estado.sql
-- =============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 00_historial.sql
-- ---------------------------------------------------------------------------
-- Historial único de cambios de estado (todas las máquinas). Ver lib/estadosServer.ts.
CREATE TABLE IF NOT EXISTS ciepi.estado_historial (
  id                 BIGSERIAL PRIMARY KEY,
  entidad            VARCHAR(30)  NOT NULL
                     CHECK (entidad IN ('inscripcion', 'blog', 'consulta', 'mentoria_reserva', 'newsletter_suscriptor')),
  entidad_id         VARCHAR(40)  NOT NULL,
  estado_de          VARCHAR(40),
  estado_a           VARCHAR(40)  NOT NULL,
  accion             VARCHAR(40)  NOT NULL,
  actor_tipo         VARCHAR(10)  NOT NULL CHECK (actor_tipo IN ('admin', 'ciudadano', 'sistema')),
  actor_id           INTEGER,
  actor_descripcion  VARCHAR(200),
  motivo             TEXT,
  es_override        BOOLEAN      NOT NULL DEFAULT false,
  ip                 VARCHAR(64),
  creado_en          TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_estado_historial_entidad
  ON ciepi.estado_historial (entidad, entidad_id, creado_en DESC);

-- ---------------------------------------------------------------------------
-- 10_inscripciones.sql
-- ---------------------------------------------------------------------------
-- Fase 2 · Máquina de estados de inscripciones (ver lib/inscripcionStates.ts).
-- Idempotente: se puede ejecutar varias veces. Requiere 00_historial.sql (ciepi.estado_historial).
--
-- 1. Estados con ids fijos 1..6 (el código usa estos ids; nunca se calculan con MAX(id)+1).
-- 2. CHECK estado_inscripcion BETWEEN 1 AND 6 como red de seguridad.
--
-- Antes de aplicar el CHECK conviene revisar que no haya filas fuera de rango:
--   SELECT estado_inscripcion, COUNT(*) FROM ciepi.inscripciones
--    WHERE estado_inscripcion NOT BETWEEN 1 AND 6 OR estado_inscripcion IS NULL GROUP BY 1;
-- y que los nombres sembrados coincidan con los ids:
--   SELECT id, nombre FROM ciepi.inscripciones_estados ORDER BY id;


-- 1. Estados sembrados ---------------------------------------------------------
INSERT INTO ciepi.inscripciones_estados (id, nombre, descripcion) VALUES
  (1, 'Nueva inscripción',       'Inscripción recibida, pendiente de revisión por CIEPI'),
  (2, 'Rechazado',               'La inscripción fue rechazada'),
  (3, 'Matriculado',             'El estudiante está matriculado en la capacitación'),
  (4, 'Retirado',                'El estudiante se retiró de la capacitación'),
  (5, 'Terminó curso',           'El estudiante completó la capacitación'),
  (6, 'Pendiente de validación', 'Inscripción con validación manual o presencial pendiente de revisión por un administrador')
ON CONFLICT (id) DO NOTHING;

-- 2. CHECK sobre el estado -------------------------------------------------------
-- Se crea NOT VALID y luego se valida: si hay filas fuera de rango, VALIDATE falla
-- y la transacción se revierte (corregir esas filas y volver a ejecutar).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'ciepi'
       AND t.relname = 'inscripciones'
       AND c.conname = 'chk_inscripciones_estado_rango'
  ) THEN
    ALTER TABLE ciepi.inscripciones
      ADD CONSTRAINT chk_inscripciones_estado_rango
      CHECK (estado_inscripcion BETWEEN 1 AND 6) NOT VALID;
  END IF;
END
$$;

ALTER TABLE ciepi.inscripciones VALIDATE CONSTRAINT chk_inscripciones_estado_rango;


-- ---------------------------------------------------------------------------
-- 20_blog.sql
-- ---------------------------------------------------------------------------
-- Fase 2 · Máquina de estados del blog (ver lib/estados/blog.ts).
-- Idempotente: se puede ejecutar varias veces. Requiere 00_historial.sql.
--
-- 1. Se retira el mecanismo antiguo de comentarios de estado: el trigger que escribía
--    ciepi.blogs.historial_estados (JSONB), su función, ciepi.set_comentario_estado y la
--    tabla global ciepi.temp_blog_comentarios. Los cambios de estado y sus motivos se
--    registran ahora en ciepi.estado_historial desde la API (lib/estadosServer.ts).
--    La columna historial_estados se conserva (solo lectura, datos antiguos).
-- 2. Se asegura el CHECK estado BETWEEN 1 AND 6.


DROP TRIGGER IF EXISTS trg_actualizar_historial_estados ON ciepi.blogs;
DROP FUNCTION IF EXISTS ciepi.actualizar_historial_estados();
-- La firma real puede ser (INT, TEXT) o (UUID, TEXT) según cómo se creó.
DROP FUNCTION IF EXISTS ciepi.set_comentario_estado(INT, TEXT);
DROP FUNCTION IF EXISTS ciepi.set_comentario_estado(UUID, TEXT);
DROP TABLE IF EXISTS ciepi.temp_blog_comentarios;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'ciepi'
       AND t.relname = 'blogs'
       AND c.contype = 'c'
       AND pg_get_constraintdef(c.oid) ILIKE '%estado%'
  ) THEN
    ALTER TABLE ciepi.blogs
      ADD CONSTRAINT chk_blogs_estado CHECK (estado BETWEEN 1 AND 6);
  END IF;
END
$$;

COMMENT ON COLUMN ciepi.blogs.historial_estados IS
  'Obsoleto (fase 2): ya no se escribe. El historial vive en ciepi.estado_historial (entidad = ''blog'').';


-- ---------------------------------------------------------------------------
-- 30_consultas.sql
-- ---------------------------------------------------------------------------
-- Fase 2 · Consultas de contacto: respuestas anteriores (ver lib/estados/consulta.ts).
-- Idempotente: se puede ejecutar varias veces. Requiere 00_historial.sql.

-- 1. Todas las respuestas enviadas (ciepi.consultas.respuesta guarda solo la última).
CREATE TABLE IF NOT EXISTS ciepi.consultas_respuestas (
  id           SERIAL       PRIMARY KEY,
  consulta_id  INTEGER      NOT NULL REFERENCES ciepi.consultas(id) ON DELETE CASCADE,
  respuesta    TEXT         NOT NULL,
  admin_id     INTEGER      REFERENCES ciepi.usuarios_administradores(id) ON DELETE SET NULL,
  creado_en    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consultas_respuestas_consulta
  ON ciepi.consultas_respuestas (consulta_id, creado_en DESC);

-- 2. Copia única de las respuestas que ya existían (solo consultas sin filas en la tabla nueva).
--    admin_id solo se copia si el id existe en usuarios_administradores.
INSERT INTO ciepi.consultas_respuestas (consulta_id, respuesta, admin_id, creado_en)
SELECT c.id,
       c.respuesta,
       ua.id,
       COALESCE(c.fecha_respuesta, c.fecha_actualizacion, c.fecha_creacion, NOW())
  FROM ciepi.consultas c
  LEFT JOIN ciepi.usuarios_administradores ua ON ua.id = c.respondido_por
 WHERE c.respuesta IS NOT NULL
   AND TRIM(c.respuesta) <> ''
   AND NOT EXISTS (SELECT 1 FROM ciepi.consultas_respuestas cr WHERE cr.consulta_id = c.id);

-- 3. respondido_por guarda el id de ciepi.usuarios_administradores (así lo escribe y lo lee
--    la API), pero create_consultas_table.sql lo declaró como FK a ciepi.usuarios. Si esa FK
--    existe, se reemplaza por una FK a usuarios_administradores (NOT VALID: no revisa las
--    filas antiguas, solo las nuevas escrituras).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
      FROM pg_constraint con
      JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
     WHERE con.contype = 'f'
       AND con.conrelid = 'ciepi.consultas'::regclass
       AND con.confrelid = to_regclass('ciepi.usuarios')
       AND att.attname = 'respondido_por'
  LOOP
    EXECUTE format('ALTER TABLE ciepi.consultas DROP CONSTRAINT %I', r.conname);
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'ciepi.consultas'::regclass
       AND conname = 'consultas_respondido_por_admin_fkey'
  ) THEN
    ALTER TABLE ciepi.consultas
      ADD CONSTRAINT consultas_respondido_por_admin_fkey
      FOREIGN KEY (respondido_por) REFERENCES ciepi.usuarios_administradores(id)
      ON DELETE SET NULL NOT VALID;
  END IF;
END $$;

COMMIT;
