-- Migration: Agregar constraints UNIQUE a cedula y correo
-- Fecha: 2025-10-01
-- Descripción: Prevenir usuarios duplicados con la misma cédula o correo electrónico

-- IMPORTANTE: Antes de ejecutar este script, verificar que no existan duplicados
-- Consultar duplicados de cédula:
-- SELECT cedula, COUNT(*) FROM ciepi.estudiantes GROUP BY cedula HAVING COUNT(*) > 1;

-- Consultar duplicados de correo:
-- SELECT correo, COUNT(*) FROM ciepi.estudiantes WHERE correo IS NOT NULL GROUP BY correo HAVING COUNT(*) > 1;

-- Si existen duplicados, deben resolverse manualmente antes de aplicar los constraints

-- Agregar constraint UNIQUE a la columna cedula
ALTER TABLE ciepi.estudiantes 
ADD CONSTRAINT estudiantes_cedula_unique UNIQUE (cedula);

-- Agregar constraint UNIQUE a la columna correo
-- El correo puede ser NULL, pero si existe debe ser único
ALTER TABLE ciepi.estudiantes 
ADD CONSTRAINT estudiantes_correo_unique UNIQUE (correo);

-- Verificar que los constraints fueron creados
-- SELECT conname, contype, conrelid::regclass 
-- FROM pg_constraint 
-- WHERE conrelid = 'ciepi.estudiantes'::regclass 
-- AND contype = 'u';

-- Resultado esperado:
-- conname: estudiantes_cedula_unique
-- conname: estudiantes_correo_unique

-- NOTAS:
-- 1. La columna cedula no permite NULL, por lo que el constraint UNIQUE garantiza que cada cédula es única
-- 2. La columna correo permite NULL, y PostgreSQL permite múltiples NULL en un constraint UNIQUE
-- 3. Los códigos de error de PostgreSQL para violación de constraint UNIQUE son:
--    - 23505: unique_violation
-- 4. El nombre del constraint se puede usar en el backend para detectar qué campo causó el error
