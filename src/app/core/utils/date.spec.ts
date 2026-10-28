import { addDays, formatTime, toIsoDate, todayIso } from './date';

describe('date utils', () => {
  it('toIsoDate usa la fecha local con ceros a la izquierda', () => {
    expect(toIsoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('todayIso devuelve la fecha del reloj recibido', () => {
    expect(todayIso(new Date(2026, 9, 16, 23, 59))).toBe('2026-10-16');
  });

  it('addDays cruza el cambio de mes sin mutar la fecha original', () => {
    const base = new Date(2026, 0, 31);
    expect(toIsoDate(addDays(base, 1))).toBe('2026-02-01');
    expect(toIsoDate(base)).toBe('2026-01-31');
  });

  it('formatTime convierte HH:mm a formato de 12 horas', () => {
    expect(formatTime('00:30')).toBe('12:30 a. m.');
    expect(formatTime('09:30')).toBe('9:30 a. m.');
    expect(formatTime('12:00')).toBe('12:00 p. m.');
    expect(formatTime('14:30')).toBe('2:30 p. m.');
  });
});
