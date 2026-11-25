-- Agregar campo cedula único a ciepi.profesores (uso interno exclusivo, nunca expuesto en UI/APIs públicas)

ALTER TABLE ciepi.profesores
    ADD COLUMN IF NOT EXISTS cedula VARCHAR(50);

CREATE UNIQUE INDEX IF NOT EXISTS uq_profesores_cedula
    ON ciepi.profesores (cedula)
    WHERE cedula IS NOT NULL;
