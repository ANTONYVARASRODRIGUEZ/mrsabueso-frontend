import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiDb, upsert } from '../data/api-db.service';
import { NewPet, Pet } from '../models';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class PetsStore {
  private readonly db = inject(ApiDb);
  private readonly auth = inject(AuthService);

  /** Mascotas del usuario con sesión. */
  readonly pets = computed(() => this.db.pets().filter((p) => p.ownerId === this.auth.user()?.id));
  /** Todas las mascotas (panel de administración). */
  readonly all = computed(() => this.db.pets());
  /** Última mascota creada; el flujo de reserva la preselecciona. */
  readonly lastCreated = signal<Pet | null>(null);

  byId(id: string | null | undefined): Pet | undefined { return this.db.pets().find((p) => p.id === id); }
  ofOwner(ownerId: string): Pet[] { return this.db.pets().filter((p) => p.ownerId === ownerId); }

  add(pet: NewPet, ownerId?: string): Observable<Pet> {
    return this.db.req<Pet>('POST', '/pets', { ...pet, ownerId }).pipe(tap((p) => {
      this.db.pets.update((l) => [...l, p]);
      this.lastCreated.set(p);
    }));
  }

  update(id: string, patch: Partial<Omit<Pet, 'id' | 'ownerId'>>): void {
    const cur = this.byId(id);
    if (!cur) return;
    this.db.fire(this.db.req<Pet>('PUT', `/pets/${id}`, { ...cur, ...patch }).pipe(tap((p) => this.db.pets.update((l) => upsert(l, p)))));
  }

  remove(id: string): void {
    this.db.fire(this.db.req('DELETE', `/pets/${id}`).pipe(tap(() => {
      this.db.pets.update((l) => l.filter((p) => p.id !== id));
      this.db.medical.update((l) => l.filter((m) => m.petId !== id));
      this.db.vaccines.update((l) => l.filter((v) => v.petId !== id));
    })));
  }
}

export const petLabel = (p: Pick<Pet, 'name' | 'breed'>): string => `${p.name} (${p.breed})`;
export const speciesLabel = (s: Pet['species']): string => (s === 'dog' ? 'Perro' : s === 'cat' ? 'Gato' : 'Otro');
