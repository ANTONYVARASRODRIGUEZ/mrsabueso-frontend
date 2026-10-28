import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiDb, upsert } from '../data/api-db.service';
import { Appointment, AppointmentStatus, NewAppointment, PaymentStatus } from '../models';
import { AuthService } from '../services/auth.service';
import { todayIso } from '../utils/date';
import { slotsForDate } from '../utils/scheduling';
import { SettingsStore } from './settings.store';

const INACTIVE: AppointmentStatus[] = ['no_show', 'cancelled'];
const nowHhmm = (): string => {
  const n = new Date();
  return `${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`;
};

@Injectable({ providedIn: 'root' })
export class AppointmentsStore {
  private readonly db = inject(ApiDb);
  private readonly auth = inject(AuthService);
  private readonly settings = inject(SettingsStore);

  /** Horarios ocupados por fecha según el servidor (el cliente no ve las citas de otros). */
  private readonly busyCache = signal<Record<string, string[]>>({});
  private readonly loadingDates = new Set<string>();

  /** Todas, de la más reciente a la más antigua. */
  readonly all = computed(() => [...this.db.appointments()].sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)));
  readonly mine = computed(() => this.all().filter((a) => a.userId === this.auth.user()?.id));

  /** Horarios ocupados en una fecha (reactivo: se puede usar dentro de computed). */
  busyTimes(date: string, excludeId?: string): Set<string> {
    const local = this.db.appointments().filter((a) => a.date === date && !INACTIVE.includes(a.status));
    if (this.auth.isAdmin()) return new Set(local.filter((a) => a.id !== excludeId).map((a) => a.time));
    const server = this.busyCache()[date];
    if (!server) this.fetchBusy(date);
    const own = this.db.appointments().find((a) => a.id === excludeId && a.date === date)?.time;
    return new Set([...(server ?? []), ...local.map((a) => a.time)].filter((t) => t !== own));
  }

  book(input: NewAppointment): Observable<Appointment> {
    return this.save(this.db.req<Appointment>('POST', '/appointments', input));
  }

  /** Reserva creada por el administrador a nombre de un cliente. */
  adminCreate(userId: string, input: NewAppointment, status: AppointmentStatus = 'confirmed'): Observable<Appointment> {
    return this.save(this.db.req<Appointment>('POST', '/appointments/admin', { ...input, userId, status }));
  }

  cancel(id: string): Observable<Appointment> { return this.save(this.db.req('POST', `/appointments/${id}/cancel`)); }

  reschedule(id: string, date: string, time: string, _byAdmin = false): Observable<Appointment> {
    return this.save(this.db.req('POST', `/appointments/${id}/reschedule`, { date, time }));
  }

  setStatus(id: string, status: AppointmentStatus): Observable<Appointment> { return this.save(this.db.req('PATCH', `/appointments/${id}/status`, { status })); }
  setPayment(id: string, payment: PaymentStatus): Observable<Appointment> { return this.save(this.db.req('PATCH', `/appointments/${id}/payment`, { payment })); }
  setNotes(id: string, notes: string): Observable<Appointment> { return this.save(this.db.req('PATCH', `/appointments/${id}/notes`, { notes })); }

  setEndTime(id: string, endTime: string): Observable<Appointment> { return this.save(this.db.req('PATCH', `/appointments/${id}/end-time`, { endTime })); }

  markReminderSent(id: string): void { this.db.fire(this.save(this.db.req('POST', `/appointments/${id}/reminder`))); }

  /** Un horario puede elegirse si el día está abierto, no pasó y no está ocupado. */
  isSlotFree(date: string, time: string, excludeId?: string): boolean {
    return slotsForDate(this.settings.settings(), date).includes(time)
      && !(date === todayIso() && time <= nowHhmm())
      && !this.busyTimes(date, excludeId).has(time);
  }

  private fetchBusy(date: string): void {
    if (this.loadingDates.has(date)) return;
    this.loadingDates.add(date);
    this.db.req<{ busy: string[] }>('GET', `/appointments/slots?date=${date}`).subscribe({
      next: (r) => { this.loadingDates.delete(date); this.busyCache.update((c) => ({ ...c, [date]: r.busy })); },
      error: () => this.loadingDates.delete(date),
    });
  }

  /** Guarda la cita devuelta por el servidor; si falló por horario, refresca los ocupados. */
  private save(obs: Observable<Appointment>): Observable<Appointment> {
    return obs.pipe(tap({
      next: (a) => { this.db.appointments.update((l) => upsert(l, a)); this.busyCache.set({}); },
      error: () => this.busyCache.set({}),
    }));
  }
}
