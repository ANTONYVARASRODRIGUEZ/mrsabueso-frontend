import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MedicalStore, vaccineStatus } from '../../core/state/medical.store';
import { PetsStore, speciesLabel } from '../../core/state/pets.store';
import { UiStore } from '../../core/state/ui.store';
import { formatDate } from '../../core/utils/date';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';

export const KIND_LABEL = { consulta: 'Consulta', tratamiento: 'Tratamiento', cirugia: 'Cirugía', examen: 'Examen', nota: 'Nota' } as const;
export const VACCINE_STATUS_LABEL = { ok: 'Vigente', soon: 'Por vencer', overdue: 'Vencida', none: 'Sin próxima dosis' } as const;
export const VACCINE_STATUS_TONE = { ok: 'success', soon: 'warn', overdue: 'danger', none: 'info' } as const;

/** Carnet de vacunación e historial clínico de una mascota (solo lectura para el cliente). */
@Component({
  selector: 'app-pet-record-modal',
  standalone: true,
  imports: [ModalComponent, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pet-record-modal.component.html',
  styleUrl: './pet-record-modal.component.scss',
})
export class PetRecordModalComponent {
  protected readonly ui = inject(UiStore);
  private readonly pets = inject(PetsStore);
  private readonly medical = inject(MedicalStore);

  protected readonly pet = computed(() => this.pets.byId(this.ui.petRecordId()));
  protected readonly vaccines = computed(() => this.medical.vaccinesOf(this.ui.petRecordId() ?? ''));
  protected readonly entries = computed(() => this.medical.entriesOf(this.ui.petRecordId() ?? ''));
  protected readonly fmt = formatDate;
  protected readonly speciesLabel = speciesLabel;
  protected readonly kind = KIND_LABEL;
  protected readonly status = vaccineStatus;
  protected readonly statusLabel = VACCINE_STATUS_LABEL;
  protected readonly statusTone = VACCINE_STATUS_TONE;

  protected close(): void { this.ui.petRecordId.set(null); }
}
