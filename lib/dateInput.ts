/**
 * Convierte una fecha (ISO o Date) al formato de <input type="datetime-local">
 * ("YYYY-MM-DDTHH:mm") usando la hora LOCAL del navegador.
 *
 * No usar toISOString(): devuelve UTC y en Panamá (UTC-5) desplazaba 5 horas
 * la fecha del evento cada vez que se editaba y guardaba.
 */
export function toDateTimeLocalInput(value: string | Date | null | undefined): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
