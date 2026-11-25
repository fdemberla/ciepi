-- =============================================================================
-- Fase 3: correcciones finales (fechas de eventos y capacitaciones, sedes/
-- edificios/aulas desactivables). Idempotente. Requiere las fases 1 y 2.
-- Si hay filas antiguas que no cumplen las reglas de fechas, las restricciones
-- quedan NOT VALID y se muestra un NOTICE con la consulta para encontrarlas.
--   psql -h <host> -U <usuario> -d <base> -f database/fase3_correcciones.sql
-- =============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 20_eventos.sql
-- ---------------------------------------------------------------------------
-- =============================================================================
-- Fase 3 · Eventos: la fecha de fin no puede ser anterior a la de inicio.
-- Ver lib/eventoEstado.ts (validarFechasEvento) y app/api/admin/eventos/**.
--
-- Columnas reales (database/verificar_columnas.sql): ciepi.eventos.fecha_inicio y
-- fecha_fin son TIMESTAMPTZ; fecha_fin admite NULL (el evento dura hasta el final
-- del día de inicio, hora de Panamá).
--
-- Idempotente: se puede ejecutar varias veces.
--   1. Añade el CHECK como NOT VALID (no bloquea la tabla revisando filas viejas;
--      sí se aplica a las filas nuevas o modificadas).
--   2. Lo valida solo si ninguna fila existente lo incumple. Si hay filas que lo
--      incumplen, deja un NOTICE con los ids y el CHECK queda NOT VALID hasta que
--      se corrijan a mano y se vuelva a ejecutar este script.
--   psql -h <host> -U <usuario> -d <base> -f database/fase3/20_eventos.sql
-- =============================================================================

DO $$
DECLARE
  v_invalidas TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ciepi'
      AND t.relname = 'eventos'
      AND c.conname = 'eventos_fecha_fin_posterior_chk'
  ) THEN
    ALTER TABLE ciepi.eventos
      ADD CONSTRAINT eventos_fecha_fin_posterior_chk
      CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio) NOT VALID;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'ciepi'
      AND t.relname = 'eventos'
      AND c.conname = 'eventos_fecha_fin_posterior_chk'
      AND NOT c.convalidated
  ) THEN
    SELECT string_agg(id::text, ', ' ORDER BY id)
      INTO v_invalidas
      FROM ciepi.eventos
     WHERE fecha_fin IS NOT NULL AND fecha_fin < fecha_inicio;

    IF v_invalidas IS NULL THEN
      ALTER TABLE ciepi.eventos VALIDATE CONSTRAINT eventos_fecha_fin_posterior_chk;
    ELSE
      RAISE NOTICE 'eventos_fecha_fin_posterior_chk queda NOT VALID: corregir fecha_fin de los eventos %', v_invalidas;
    END IF;
  END IF;
END
$$;


-- ---------------------------------------------------------------------------
-- 30_capacitaciones.sql
-- ---------------------------------------------------------------------------
-- =============================================================================
-- Fase 3 · Capacitaciones, sedes, edificios, aulas y profesores
-- Idempotente: se puede ejecutar varias veces.
--
-- 1. Columna `activo` en sedes, edificios y aulas (baja lógica). Ya existe en las
--    instalaciones actuales (ver database/verificar_columnas.sql); se asegura por si
--    alguna base se creó antes de create_sedes_edificios_aulas_horarios.sql.
-- 2. Coherencia de fechas en ciepi.capacitaciones:
--      fecha_final_inscripcion   >= fecha_inicio_inscripcion
--      fecha_final_capacitacion  >= fecha_inicio_capacitacion
--    Se crean NOT VALID (no bloquean la tabla ni fallan por filas antiguas) y se
--    validan solo si no hay filas que las incumplan; si las hay se muestra un aviso
--    con la consulta para encontrarlas. Las filas nuevas o editadas se comprueban
--    desde el momento en que existe la restricción, esté validada o no.
--
-- La API ya lo valida (lib/capacitacionDetails.ts) y se niega a borrar sedes,
-- edificios, aulas y profesores en uso (409). Las FK siguen con ON DELETE
-- CASCADE / SET NULL; cambiarlas a RESTRICT queda como mejora opcional.
-- =============================================================================


ALTER TABLE ciepi.sedes     ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE ciepi.edificios ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE ciepi.aulas     ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE ciepi.profesores ADD COLUMN IF NOT EXISTS activo BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
DECLARE
    v_malas INTEGER;
BEGIN
    -- Ventana de inscripción
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_capacitaciones_fechas_inscripcion'
          AND conrelid = 'ciepi.capacitaciones'::regclass
    ) THEN
        ALTER TABLE ciepi.capacitaciones
            ADD CONSTRAINT chk_capacitaciones_fechas_inscripcion
            CHECK (
                fecha_inicio_inscripcion IS NULL
                OR fecha_final_inscripcion IS NULL
                OR fecha_final_inscripcion >= fecha_inicio_inscripcion
            ) NOT VALID;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_capacitaciones_fechas_inscripcion'
          AND conrelid = 'ciepi.capacitaciones'::regclass
          AND NOT convalidated
    ) THEN
        SELECT COUNT(*) INTO v_malas FROM ciepi.capacitaciones
        WHERE fecha_final_inscripcion < fecha_inicio_inscripcion;
        IF v_malas = 0 THEN
            ALTER TABLE ciepi.capacitaciones VALIDATE CONSTRAINT chk_capacitaciones_fechas_inscripcion;
        ELSE
            RAISE NOTICE 'chk_capacitaciones_fechas_inscripcion queda NOT VALID: % capacitaciones con fin de inscripción anterior al inicio. Corrígelas (SELECT id, nombre FROM ciepi.capacitaciones WHERE fecha_final_inscripcion < fecha_inicio_inscripcion) y vuelve a ejecutar este script.', v_malas;
        END IF;
    END IF;

    -- Fechas de la capacitación
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_capacitaciones_fechas_capacitacion'
          AND conrelid = 'ciepi.capacitaciones'::regclass
    ) THEN
        ALTER TABLE ciepi.capacitaciones
            ADD CONSTRAINT chk_capacitaciones_fechas_capacitacion
            CHECK (
                fecha_inicio_capacitacion IS NULL
                OR fecha_final_capacitacion IS NULL
                OR fecha_final_capacitacion >= fecha_inicio_capacitacion
            ) NOT VALID;
    END IF;

    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_capacitaciones_fechas_capacitacion'
          AND conrelid = 'ciepi.capacitaciones'::regclass
          AND NOT convalidated
    ) THEN
        SELECT COUNT(*) INTO v_malas FROM ciepi.capacitaciones
        WHERE fecha_final_capacitacion < fecha_inicio_capacitacion;
        IF v_malas = 0 THEN
            ALTER TABLE ciepi.capacitaciones VALIDATE CONSTRAINT chk_capacitaciones_fechas_capacitacion;
        ELSE
            RAISE NOTICE 'chk_capacitaciones_fechas_capacitacion queda NOT VALID: % capacitaciones con fin anterior al inicio. Corrígelas (SELECT id, nombre FROM ciepi.capacitaciones WHERE fecha_final_capacitacion < fecha_inicio_capacitacion) y vuelve a ejecutar este script.', v_malas;
        END IF;
    END IF;
END $$;

-- Índices para las comprobaciones de dependencias antes de borrar (409).
CREATE INDEX IF NOT EXISTS idx_capacitaciones_sede_id     ON ciepi.capacitaciones (sede_id)     WHERE sede_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_capacitaciones_edificio_id ON ciepi.capacitaciones (edificio_id) WHERE edificio_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_capacitaciones_aula_id     ON ciepi.capacitaciones (aula_id)     WHERE aula_id IS NOT NULL;


-- Verificación:
-- SELECT conname, convalidated FROM pg_constraint
-- WHERE conrelid = 'ciepi.capacitaciones'::regclass AND conname LIKE 'chk_capacitaciones_fechas_%';

COMMIT;
