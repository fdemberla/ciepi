-- Columnas de validación biométrica (Tribunal Electoral / INADEH).
-- Existían en la BD de desarrollo sin script; sin ellas fallan "Ver Detalles"
-- de una capacitación y el registro de inscripciones. Idempotente.

ALTER TABLE ciepi.estudiantes
    ADD COLUMN IF NOT EXISTS biometria_verificada BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS biometria_id_auditoria VARCHAR(100),
    ADD COLUMN IF NOT EXISTS biometria_fecha TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE ciepi.inscripciones
    ADD COLUMN IF NOT EXISTS biometria_verificada BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS biometria_id_auditoria VARCHAR(100),
    ADD COLUMN IF NOT EXISTS biometria_score NUMERIC(5, 4),
    ADD COLUMN IF NOT EXISTS biometria_liveness NUMERIC(5, 4),
    ADD COLUMN IF NOT EXISTS biometria_estado VARCHAR(50),
    ADD COLUMN IF NOT EXISTS biometria_fecha TIMESTAMP WITHOUT TIME ZONE;
