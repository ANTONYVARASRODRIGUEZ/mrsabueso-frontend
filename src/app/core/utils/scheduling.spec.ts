import { DEFAULT_SETTINGS } from '../config/business';
import { BusinessSettings } from '../models';
import { dayOfWeek, isOpenDay, nextOpenDate, slotsForDate } from './scheduling';

describe('scheduling', () => {
  const settings: BusinessSettings = { ...structuredClone(DEFAULT_SETTINGS), closedDates: ['2026-10-20'] };

  it('dayOfWeek calcula el día sin desfase de zona horaria', () => {
    expect(dayOfWeek('2026-10-18')).toBe(0); // domingo
    expect(dayOfWeek('2026-10-19')).toBe(1); // lunes
  });

  it('isOpenDay respeta días cerrados y feriados', () => {
    expect(isOpenDay(settings, '2026-10-18')).toBeFalse(); // domingo cerrado
    expect(isOpenDay(settings, '2026-10-20')).toBeFalse(); // feriado
    expect(isOpenDay(settings, '2026-10-19')).toBeTrue();
    expect(isOpenDay(settings, 'no-es-fecha')).toBeFalse();
  });

  it('slotsForDate devuelve solo horarios dentro del horario de atención', () => {
    const s = structuredClone(settings);
    s.hours[1] = { day: 1, open: true, from: '10:00', to: '16:30' };
    expect(slotsForDate(s, '2026-10-19')).toEqual(['11:00', '14:30', '16:00']);
    expect(slotsForDate(s, '2026-10-18')).toEqual([]);
  });

  it('nextOpenDate salta domingos y feriados', () => {
    expect(nextOpenDate(settings, '2026-10-18')).toBe('2026-10-19');
    expect(nextOpenDate(settings, '2026-10-20')).toBe('2026-10-21');
  });
});
