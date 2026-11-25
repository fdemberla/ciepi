-- Verificación (solo lectura): indica qué scripts de database/ faltan en esta BD.
-- "aplicado" = el objeto que crea el script ya existe.
SELECT script, CASE WHEN ok THEN 'aplicado' ELSE 'FALTA' END AS estado
FROM (VALUES
  ('0. requisito: tabla ciepi.sedes',
     to_regclass('ciepi.sedes') IS NOT NULL),
  ('1. add_capacitaciones_detalles_y_profesores.sql',
     to_regclass('ciepi.profesores') IS NOT NULL
     AND to_regclass('ciepi.capacitacion_profesores') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'ciepi' AND table_name = 'capacitaciones' AND column_name = 'modalidad')),
  ('2. add_profesor_cedula.sql',
     EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'ciepi' AND table_name = 'profesores' AND column_name = 'cedula')),
  ('3. create_sedes_edificios_aulas_horarios.sql',
     to_regclass('ciepi.edificios') IS NOT NULL
     AND to_regclass('ciepi.aulas') IS NOT NULL
     AND to_regclass('ciepi.capacitacion_horarios') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'ciepi' AND table_name = 'capacitaciones' AND column_name = 'aula_id')),
  ('4. add_pendiente_validacion_estado.sql',
     EXISTS (SELECT 1 FROM ciepi.inscripciones_estados WHERE LOWER(nombre) LIKE 'pendiente%')),
  ('5. create_newsletter_tables.sql',
     to_regclass('ciepi.newsletter_suscriptores') IS NOT NULL
     AND to_regclass('ciepi.newsletter_envios') IS NOT NULL),
  ('6. migrate_quitar_basepath_ciepi.sql',
     NOT EXISTS (SELECT 1 FROM ciepi.blogs WHERE imagen_banner LIKE '/ciepi/%')),
  ('7. create_mentorias.sql',
     to_regclass('ciepi.mentoria_areas') IS NOT NULL
     AND to_regclass('ciepi.mentor_disponibilidad') IS NOT NULL
     AND to_regclass('ciepi.mentor_bloqueos') IS NOT NULL
     AND to_regclass('ciepi.mentoria_reservas') IS NOT NULL
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'ciepi' AND table_name = 'profesores' AND column_name = 'es_mentor')
     AND EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'ciepi' AND table_name = 'mentoria_reservas' AND column_name = 'recordatorio_enviado_en'))
) AS t(script, ok)
ORDER BY script;

-- El código espera que "Pendiente de validación" tenga id = 6:
SELECT id, nombre FROM ciepi.inscripciones_estados ORDER BY id;
