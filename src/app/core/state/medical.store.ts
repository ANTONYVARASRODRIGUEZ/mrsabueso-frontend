import { Injectable, computed, inject } from '@angular/core';
import { tap } from 'rxjs';
import { ApiDb, upsert } from '../data/api-db.service';
import { MedicalEntry, Vaccination } from '../models';
import { addDays, toIsoDate, todayIso } from '../utils/date';

export type VaccineStatus = 'ok' | 'soon' | 'overdue' | 'none';

/** Estado de una vacuna según su próxima dosis (por vencer = dentro de 30 días). */
export function vaccineStatus(v: Pick<Vaccination, 'nextDue'>, today: string = todayIso(), soonDays = 30): VaccineStatus {
  if (!v.nextDue) return 'none';
  if (v.nextDue < today) return 'overdue';
  const [y, m, d] = today.split('-').map(Number);
  return v.nextDue <= toIsoDate(addDays(new Date(y, m - 1, d), soonDays)) ? 'soon' : 'ok';
}

@Injectable({ providedIn: 'root' })
export class MedicalStore {
  private readonly db = inject(ApiDb);

  /** Última dosis de cada vacuna por mascota (las anteriores ya no generan alertas). */
  readonly latestVaccines = computed(() => {
    const map = new Map<string, Vaccination>();
    for (const v of this.db.vaccines()) {
      const key = `${v.petId}|${v.vaccine.toLowerCase()}`;
      const cur = map.get(key);
      if (!cur || v.date > cur.date) map.set(key, v);
    }
    return [...map.values()];
  });

  entriesOf(petId: string): MedicalEntry[] { return this.db.medical().filter((m) => m.petId === petId).sort((a, b) => b.date.localeCompare(a.date)); }
  vaccinesOf(petId: string): Vaccination[] { return this.db.vaccines().filter((v) => v.petId === petId).sort((a, b) => b.date.localeCompare(a.date)); }

  saveEntry(e: Omit<MedicalEntry, 'id'> & { id?: string }): void {
    this.db.fire(this.db.req<MedicalEntry>('POST', '/medical', e).pipe(tap((x) => this.db.medical.update((l) => upsert(l, x)))));
  }
  removeEntry(id: string): void {
    this.db.fire(this.db.req('DELETE', `/medical/${id}`).pipe(tap(() => this.db.medical.update((l) => l.filter((x) => x.id !== id)))));
  }

  saveVaccine(v: Omit<Vaccination, 'id'> & { id?: string }): void {
    this.db.fire(this.db.req<Vaccination>('POST', '/vaccines', v).pipe(tap((x) => this.db.vaccines.update((l) => upsert(l, x)))));
  }
  markVaccineReminded(id: string): void {
    this.db.fire(this.db.req<Vaccination>('POST', `/vaccines/${id}/reminder`).pipe(tap((x) => this.db.vaccines.update((l) => upsert(l, x)))));
  }
  removeVaccine(id: string): void {
    this.db.fire(this.db.req('DELETE', `/vaccines/${id}`).pipe(tap(() => this.db.vaccines.update((l) => l.filter((x) => x.id !== id)))));
  }
}
