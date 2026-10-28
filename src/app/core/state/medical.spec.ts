import { vaccineStatus } from './medical.store';

describe('vaccineStatus', () => {
  const today = '2026-10-16';
  it('sin próxima dosis', () => expect(vaccineStatus({}, today)).toBe('none'));
  it('vencida si la fecha ya pasó', () => expect(vaccineStatus({ nextDue: '2026-10-15' }, today)).toBe('overdue'));
  it('por vencer dentro de 30 días (inclusive)', () => {
    expect(vaccineStatus({ nextDue: '2026-10-16' }, today)).toBe('soon');
    expect(vaccineStatus({ nextDue: '2026-11-15' }, today)).toBe('soon');
  });
  it('vigente si falta más de 30 días', () => expect(vaccineStatus({ nextDue: '2026-11-16' }, today)).toBe('ok'));
});
