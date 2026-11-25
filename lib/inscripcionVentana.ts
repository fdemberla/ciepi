/**
 * Ventana de inscripción de una capacitación. Las fechas son DATE (día completo,
 * hora de Panamá): la inscripción sigue abierta TODO el último día.
 * Antes se comparaba la DATE con NOW() y se cerraba a las 00:00 del último día.
 */
export const HOY_PANAMA_SQL = "(NOW() AT TIME ZONE 'America/Panama')::date";

/** Columnas `inscripcion_iniciada` e `inscripcion_vigente` para un SELECT. */
export function ventanaInscripcionSql(alias: string): string {
  return `(${alias}.fecha_inicio_inscripcion IS NULL OR ${alias}.fecha_inicio_inscripcion <= ${HOY_PANAMA_SQL}) AS inscripcion_iniciada,
          (${alias}.fecha_final_inscripcion IS NULL OR ${alias}.fecha_final_inscripcion >= ${HOY_PANAMA_SQL}) AS inscripcion_vigente`;
}
