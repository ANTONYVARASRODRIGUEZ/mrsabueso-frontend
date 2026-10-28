const pad = (n: number): string => String(n).padStart(2, '0');

/** Fecha local en formato yyyy-mm-dd (sin desfase por zona horaria). */
export function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayIso(now: Date = new Date()): string {
  return toIsoDate(now);
}

export function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
  return copy;
}

/** "14:30" → "2:30 p. m." */
export function formatTime(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const suffix = h >= 12 ? 'p. m.' : 'a. m.';
  return `${h % 12 === 0 ? 12 : h % 12}:${pad(m)} ${suffix}`;
}

/** "09:30", "11:00" → "9:30 – 11:00 a. m."; si cruza el mediodía muestra ambos sufijos. */
export function formatTimeRange(start: string, end?: string): string {
  if (!end) return formatTime(start);
  const a = formatTime(start); const b = formatTime(end);
  const sa = a.slice(-5); const sb = b.slice(-5);
  return sa === sb ? `${a.slice(0, -6)} – ${b}` : `${a} – ${b}`;
}

/** "2026-09-28" → "28 sep 2026" */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(y, m - 1, d),
  );
}
