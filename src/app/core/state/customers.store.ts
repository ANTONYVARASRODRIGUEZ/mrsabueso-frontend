import { Injectable, computed, inject } from '@angular/core';
import { Observable, tap, throwError } from 'rxjs';
import { ApiDb, upsert } from '../data/api-db.service';
import { User } from '../models';

/** Clientes registrados (vista para administración). */
@Injectable({ providedIn: 'root' })
export class CustomersStore {
  private readonly db = inject(ApiDb);
  readonly clients = computed<User[]>(() =>
    this.db.users().filter((u) => u.role === 'client').sort((a, b) => a.fullName.localeCompare(b.fullName)));

  /** Cliente con el mismo teléfono (se comparan solo los dígitos). */
  findByPhone(phone: string, excludeId?: string): User | undefined {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 7) return undefined;
    return this.clients().find((c) => c.id !== excludeId && (c.phone ?? '').replace(/\D/g, '') === digits);
  }

  byId(id: string): User | undefined { return this.clients().find((c) => c.id === id); }

  setActive(id: string, active: boolean): void {
    this.db.fire(this.db.req<User>('PATCH', `/customers/${id}/active`, { active }).pipe(tap((u) => this.db.users.update((l) => upsert(l, u)))));
  }

  /**
   * Alta de un cliente por parte del administrador (llamadas o atención presencial).
   * Sin contraseña: si tiene correo, puede activar su cuenta con "Recuperar contraseña".
   */
  create(input: { fullName: string; phone: string; email?: string; consent: boolean }): Observable<User> {
    if (!input.consent) return throwError(() => new Error('Debes confirmar que el cliente aceptó el tratamiento de sus datos.'));
    return this.db.req<User>('POST', '/customers', input).pipe(tap((u) => this.db.users.update((l) => [...l, u])));
  }
}
