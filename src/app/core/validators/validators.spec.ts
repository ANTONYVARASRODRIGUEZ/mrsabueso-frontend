import { FormControl, FormGroup } from '@angular/forms';
import { matchFields, noBlank, notPastDate, passwordStrength, phoneValidator } from './validators';

describe('validators', () => {
  it('phoneValidator acepta números válidos y vacío, rechaza texto', () => {
    expect(phoneValidator(new FormControl('+51 923 399 129'))).toBeNull();
    expect(phoneValidator(new FormControl(''))).toBeNull();
    expect(phoneValidator(new FormControl('abc'))).toEqual({ phone: true });
  });

  it('notPastDate rechaza fechas anteriores a hoy', () => {
    const v = notPastDate(() => '2026-10-16');
    expect(v(new FormControl('2026-10-15'))).toEqual({ pastDate: true });
    expect(v(new FormControl('2026-10-16'))).toBeNull();
    expect(v(new FormControl('2026-11-01'))).toBeNull();
  });

  it('noBlank rechaza cadenas solo con espacios', () => {
    expect(noBlank(new FormControl('   '))).toEqual({ blank: true });
    expect(noBlank(new FormControl('Boby'))).toBeNull();
  });

  it('passwordStrength exige 8+ caracteres con letra y número', () => {
    expect(passwordStrength(new FormControl('Demo1234'))).toBeNull();
    expect(passwordStrength(new FormControl('corta1'))).toEqual({ weakPassword: true });
    expect(passwordStrength(new FormControl('sinnumeros'))).toEqual({ weakPassword: true });
  });

  it('matchFields detecta contraseñas distintas', () => {
    const mk = (a: string, b: string) => new FormGroup({ a: new FormControl(a), b: new FormControl(b) });
    expect(matchFields('a', 'b')(mk('x', 'x'))).toBeNull();
    expect(matchFields('a', 'b')(mk('x', 'y'))).toEqual({ mismatch: true });
  });
});
