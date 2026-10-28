import { Injectable, computed, signal } from '@angular/core';
import { Appointment } from '../models';

/** Estado de interfaz: qué diálogos del sitio público están abiertos. */
@Injectable({ providedIn: 'root' })
export class UiStore {
  readonly accountOpen = signal(false);
  readonly addPetOpen = signal(false);
  readonly petRecordId = signal<string | null>(null);
  readonly reviewTarget = signal<Appointment | null>(null);
  readonly rescheduleTarget = signal<Appointment | null>(null);

  readonly anyModalOpen = computed(() =>
    this.accountOpen() || this.addPetOpen() || !!this.petRecordId() || !!this.reviewTarget() || !!this.rescheduleTarget());

  openAccount(): void { this.accountOpen.set(true); }
  closeAccount(): void { this.accountOpen.set(false); }
  openAddPet(): void { this.addPetOpen.set(true); }
  closeAddPet(): void { this.addPetOpen.set(false); }
}
