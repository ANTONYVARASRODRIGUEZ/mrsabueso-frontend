import { BusinessSettings } from '../models';

/** Día de la semana (0 = domingo) de una fecha yyyy-mm-dd, sin desfase horario. */
export function dayOfWeek(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export const isIsoDate = (v: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(v);

export function isOpenDay(settings: BusinessSettings, iso: string): boolean {
  if (!isIsoDate(iso) || settings.closedDates.includes(iso)) return false;
  return settings.hours.find((h) => h.day === dayOfWeek(iso))?.open ?? false;
}

const toMin = (hhmm: string): number => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));

/**
 * Horarios de cita ofrecidos ese día (dentro del horario de atención).
 * Con `durationMin`, solo los que terminan a más tardar a la hora de cierre.
 */
export function slotsForDate(settings: BusinessSettings, iso: string, durationMin = 0): string[] {
  if (!isOpenDay(settings, iso)) return [];
  const h = settings.hours.find((x) => x.day === dayOfWeek(iso));
  if (!h) return [];
  return [...settings.slots]
    .filter((s) => s >= h.from && s < h.to && toMin(s) + durationMin <= toMin(h.to))
    .sort();
}

/** Primer día abierto desde `fromIso` (inclusive), hasta 60 días; si no hay, devuelve `fromIso`. */
export function nextOpenDate(settings: BusinessSettings, fromIso: string): string {
  const [y, m, d] = fromIso.split('-').map(Number);
  for (let i = 0; i < 60; i++) {
    const dt = new Date(y, m - 1, d + i);
    const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
    if (isOpenDay(settings, iso)) return iso;
  }
  return fromIso;
}
