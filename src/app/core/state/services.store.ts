import { Injectable, computed, inject } from '@angular/core';
import { tap } from 'rxjs';
import { ApiDb, upsert } from '../data/api-db.service';
import { Service } from '../models';

@Injectable({ providedIn: 'root' })
export class ServicesStore {
  private readonly db = inject(ApiDb);
  readonly all = computed(() => this.db.services());
  /** Visibles en el sitio. */
  readonly active = computed(() => this.db.services().filter((s) => s.active));
  /** Reservables en línea. */
  readonly bookable = computed(() => this.active().filter((s) => s.bookable));

  byId(id: string): Service | undefined { return this.db.services().find((s) => s.id === id); }

  save(service: Service): void {
    this.db.fire(this.db.req<Service>('PUT', `/services/${service.id}`, service).pipe(tap((s) => this.db.services.update((l) => upsert(l, s)))));
  }
  remove(id: string): void {
    this.db.fire(this.db.req('DELETE', `/services/${id}`).pipe(tap(() => this.db.services.update((l) => l.filter((s) => s.id !== id)))));
  }
  toggleActive(id: string): void {
    this.db.fire(this.db.req<Service>('POST', `/services/${id}/toggle-active`).pipe(tap((s) => this.db.services.update((l) => upsert(l, s)))));
  }
}
