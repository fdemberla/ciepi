-- Agrega el estado "Pendiente de validación" para inscripciones con validación manual o presencial
INSERT INTO ciepi.inscripciones_estados (id, nombre, descripcion)
SELECT
  COALESCE(MAX(id), 0) + 1,
  'Pendiente de validación',
  'Inscripción con validación manual o presencial pendiente de revisión por un administrador'
FROM ciepi.inscripciones_estados
WHERE NOT EXISTS (
  SELECT 1 FROM ciepi.inscripciones_estados WHERE LOWER(nombre) LIKE 'pendiente%'
);
