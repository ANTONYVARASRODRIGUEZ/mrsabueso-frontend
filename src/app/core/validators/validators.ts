import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { todayIso } from '../utils/date';

const PHONE_RE = /^\+?[0-9][0-9\s-]{6,14}$/;

export const phoneValidator: ValidatorFn = (c: AbstractControl): ValidationErrors | null => {
  const v = String(c.value ?? '').trim();
  return !v || PHONE_RE.test(v) ? null : { phone: true };
};

/** La fecha (yyyy-mm-dd) no puede ser anterior a hoy. */
export function notPastDate(today: () => string = todayIso): ValidatorFn {
  return (c) => {
    const v = String(c.value ?? '');
    return !v || v >= today() ? null : { pastDate: true };
  };
}

export const noBlank: ValidatorFn = (c) =>
  String(c.value ?? '').length > 0 && String(c.value).trim().length === 0 ? { blank: true } : null;

/** Mínimo 8 caracteres con al menos una letra y un número. */
export const passwordStrength: ValidatorFn = (c) => {
  const v = String(c.value ?? '');
  if (!v) return null;
  return v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v) ? null : { weakPassword: true };
};

/** Validador de grupo: dos controles deben coincidir. */
export function matchFields(a: string, b: string): ValidatorFn {
  return (group) => {
    const va = group.get(a)?.value;
    const vb = group.get(b)?.value;
    return va === vb ? null : { mismatch: true };
  };
}
