import { Injectable, computed, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiDb, upsert } from '../data/api-db.service';
import { Appointment, Review } from '../models';

@Injectable({ providedIn: 'root' })
export class ReviewsStore {
  private readonly db = inject(ApiDb);

  readonly all = computed(() => [...this.db.reviews()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  readonly visible = computed(() => this.all().filter((r) => !r.hidden));
  readonly average = computed(() => {
    const v = this.visible();
    return v.length ? v.reduce((s, r) => s + r.rating, 0) / v.length : 0;
  });

  forAppointment(appointmentId: string): Review | undefined { return this.db.reviews().find((r) => r.appointmentId === appointmentId); }

  add(appt: Appointment, rating: number, comment: string): Observable<Review> {
    return this.db.req<Review>('POST', '/reviews', { appointmentId: appt.id, rating, comment }).pipe(tap((r) => this.db.reviews.update((l) => [r, ...l])));
  }

  toggleHidden(id: string): void { this.db.fire(this.db.req<Review>('POST', `/reviews/${id}/toggle-hidden`).pipe(tap((r) => this.store(r)))); }
  reply(id: string, reply: string): void { this.db.fire(this.db.req<Review>('PUT', `/reviews/${id}/reply`, { reply }).pipe(tap((r) => this.store(r)))); }
  remove(id: string): void {
    this.db.fire(this.db.req('DELETE', `/reviews/${id}`).pipe(tap(() => this.db.reviews.update((l) => l.filter((r) => r.id !== id)))));
  }

  private store(r: Review): void { this.db.reviews.update((l) => upsert(l, r)); }
}
