/**
 * Utilidades de hora en zona horaria de Perú (America/Lima).
 *
 * Lima NO tiene horario de verano → offset FIJO UTC−5. Estas funciones calculan
 * la hora de pared de Lima a partir del UTC del instante, SIN depender de la
 * zona horaria del proceso Node (no usan getHours/getDay locales). Así el
 * cálculo de tardanzas da igual en el servidor, en CI o en el Windows de dev.
 *
 * Convención del sistema:
 *  · `@db.Timestamptz` (p. ej. horaIngreso) = instante real → usar estas funciones.
 *  · `@db.Time` (p. ej. horaInicio del horario) = hora de pared guardada en UTC
 *    → leer con getUTCHours()/getUTCMinutes() (NO con estas funciones).
 */

const LIMA_OFFSET_MIN = 5 * 60; // UTC−5, sin DST

/** Minutos del día (0..1439) de un instante, en hora de pared de America/Lima. */
export function limaMinutesOfDay(instant: Date): number {
  const utcMin = instant.getUTCHours() * 60 + instant.getUTCMinutes();
  return ((utcMin - LIMA_OFFSET_MIN) % 1440 + 1440) % 1440;
}

/** Día de la semana en Lima: 1=Lunes … 6=Sábado, 7=Domingo. */
export function limaDiaSemana(instant: Date): number {
  const local = new Date(instant.getTime() - LIMA_OFFSET_MIN * 60_000);
  const dow = local.getUTCDay(); // 0=Domingo … 6=Sábado
  return dow === 0 ? 7 : dow;
}
