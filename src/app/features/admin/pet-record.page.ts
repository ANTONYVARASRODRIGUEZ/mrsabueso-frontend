import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MedicalEntry, MedicalKind, PetSex, PetSpecies, Vaccination } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { AppointmentsStore } from '../../core/state/appointments.store';
import { CustomersStore } from '../../core/state/customers.store';
import { MedicalStore, vaccineStatus } from '../../core/state/medical.store';
import { PetsStore, speciesLabel } from '../../core/state/pets.store';
import { formatDate, formatTime, todayIso } from '../../core/utils/date';
import { noBlank } from '../../core/validators/validators';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';
import { KIND_LABEL, VACCINE_STATUS_LABEL, VACCINE_STATUS_TONE } from '../account/pet-record-modal.component';

type Tab = 'historial' | 'vacunas' | 'citas';
const SUGGESTED_VACCINES = ['Quíntuple (DHPP)', 'Sextuple', 'Antirrábica', 'Bordetella', 'Triple felina', 'Leucemia felina', 'Mixomatosis'];

function ageLabel(birthDate?: string): string {
  if (!birthDate) return '—';
  const [y, m, d] = birthDate.split('-').map(Number);
  const now = new Date();
  let months = (now.getFullYear() - y) * 12 + (now.getMonth() - (m - 1)) - (now.getDate() < d ? 1 : 0);
  if (months < 0) months = 0;
  const years = Math.floor(months / 12); const rest = months % 12;
  return years > 0 ? `${years} ${years === 1 ? 'año' : 'años'}${rest ? ` ${rest} m` : ''}` : `${rest} ${rest === 1 ? 'mes' : 'meses'}`;
}

@Component({
  selector: 'app-pet-record-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, IconComponent, ModalComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './pet-record.page.html',
  styleUrl: './pet-record.page.scss',
})
export class PetRecordPage {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly pets = inject(PetsStore);
  private readonly customers = inject(CustomersStore);
  private readonly medical = inject(MedicalStore);
  private readonly appts = inject(AppointmentsStore);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly router = inject(Router);

  /** Parámetro de ruta /admin/mascotas/:id */
  readonly id = input.required<string>();

  protected readonly pet = computed(() => this.pets.byId(this.id()));
  protected readonly owner = computed(() => this.customers.byId(this.pet()?.ownerId ?? ''));
  protected readonly entries = computed(() => this.medical.entriesOf(this.id()));
  protected readonly vaccines = computed(() => this.medical.vaccinesOf(this.id()));
  protected readonly visits = computed(() => this.appts.all().filter((a) => a.petId === this.id()));
  protected readonly lastWeight = computed(() => this.entries().find((e) => e.weightKg)?.weightKg);

  protected readonly tab = signal<Tab>('historial');
  protected readonly entryModal = signal<MedicalEntry | 'new' | null>(null);
  protected readonly vaccineModal = signal<Vaccination | 'new' | null>(null);
  protected readonly petModal = signal(false);

  protected readonly fmtDate = formatDate;
  protected readonly fmtTime = formatTime;
  protected readonly age = ageLabel;
  protected readonly speciesLabel = speciesLabel;
  protected readonly kinds = Object.entries(KIND_LABEL) as [MedicalKind, string][];
  protected readonly kindLabel = KIND_LABEL;
  protected readonly status = vaccineStatus;
  protected readonly statusLabel = VACCINE_STATUS_LABEL;
  protected readonly statusTone = VACCINE_STATUS_TONE;
  protected readonly suggested = SUGGESTED_VACCINES;
  protected readonly today = todayIso();

  protected readonly entryForm = this.fb.group({
    date: [todayIso(), Validators.required], kind: ['consulta' as MedicalKind], title: ['', [Validators.required, noBlank]],
    description: ['', [Validators.required, noBlank]], vet: ['', Validators.required], weightKg: [null as number | null],
  });
  protected readonly vaccineForm = this.fb.group({
    vaccine: ['', [Validators.required, noBlank]], date: [todayIso(), Validators.required], nextDue: [''], lot: [''], vet: ['', Validators.required], notes: [''],
  });
  protected readonly petForm = this.fb.group({
    name: ['', [Validators.required, noBlank]], species: ['dog' as PetSpecies], breed: [''], sex: ['' as PetSex | ''], birthDate: [''], notes: [''],
  });

  /* ---- Historial clínico ---- */
  protected openEntry(e: MedicalEntry | 'new'): void {
    const vet = this.auth.user()?.fullName ?? '';
    this.entryForm.reset(e === 'new'
      ? { date: todayIso(), kind: 'consulta', title: '', description: '', vet, weightKg: null }
      : { date: e.date, kind: e.kind, title: e.title, description: e.description, vet: e.vet, weightKg: e.weightKg ?? null });
    this.entryModal.set(e);
  }
  protected saveEntry(): void {
    if (this.entryForm.invalid) { this.entryForm.markAllAsTouched(); return; }
    const cur = this.entryModal(); const v = this.entryForm.getRawValue();
    this.medical.saveEntry({ ...v, title: v.title.trim(), description: v.description.trim(), weightKg: v.weightKg ?? undefined, petId: this.id(), id: cur && cur !== 'new' ? cur.id : undefined });
    this.toast.success('Registro clínico guardado.'); this.entryModal.set(null);
  }
  protected async deleteEntry(e: MedicalEntry): Promise<void> {
    if (await this.confirm.ask({ title: 'Eliminar registro', message: `¿Eliminar “${e.title}” del historial clínico?`, confirmText: 'Eliminar', danger: true })) { this.medical.removeEntry(e.id); this.toast.success('Registro eliminado.'); }
  }

  /* ---- Vacunas ---- */
  protected openVaccine(v: Vaccination | 'new'): void {
    const vet = this.auth.user()?.fullName ?? '';
    this.vaccineForm.reset(v === 'new'
      ? { vaccine: '', date: todayIso(), nextDue: '', lot: '', vet, notes: '' }
      : { vaccine: v.vaccine, date: v.date, nextDue: v.nextDue ?? '', lot: v.lot ?? '', vet: v.vet, notes: v.notes ?? '' });
    this.vaccineModal.set(v);
  }
  protected saveVaccine(): void {
    if (this.vaccineForm.invalid) { this.vaccineForm.markAllAsTouched(); return; }
    const cur = this.vaccineModal(); const v = this.vaccineForm.getRawValue();
    if (v.nextDue && v.nextDue < v.date) { this.toast.error('La próxima dosis no puede ser anterior a la fecha de aplicación.'); return; }
    this.medical.saveVaccine({ petId: this.id(), vaccine: v.vaccine.trim(), date: v.date, nextDue: v.nextDue || undefined, lot: v.lot.trim() || undefined, vet: v.vet.trim(), notes: v.notes.trim() || undefined, id: cur && cur !== 'new' ? cur.id : undefined });
    this.toast.success('Vacuna registrada.'); this.vaccineModal.set(null);
  }
  protected async deleteVaccine(v: Vaccination): Promise<void> {
    if (await this.confirm.ask({ title: 'Eliminar vacuna', message: `¿Eliminar el registro de ${v.vaccine}?`, confirmText: 'Eliminar', danger: true })) { this.medical.removeVaccine(v.id); this.toast.success('Vacuna eliminada.'); }
  }

  /* ---- Datos de la mascota ---- */
  protected openPet(): void {
    const p = this.pet(); if (!p) return;
    this.petForm.reset({ name: p.name, species: p.species, breed: p.breed, sex: p.sex ?? '', birthDate: p.birthDate ?? '', notes: p.notes ?? '' });
    this.petModal.set(true);
  }
  protected savePet(): void {
    if (this.petForm.invalid) { this.petForm.markAllAsTouched(); return; }
    const v = this.petForm.getRawValue();
    this.pets.update(this.id(), { name: v.name.trim(), species: v.species, breed: v.breed.trim() || 'Mestizo', sex: v.sex || undefined, birthDate: v.birthDate || undefined, notes: v.notes.trim() || undefined });
    this.toast.success('Datos actualizados.'); this.petModal.set(false);
  }
  protected async deletePet(): Promise<void> {
    const p = this.pet(); if (!p) return;
    if (await this.confirm.ask({ title: 'Eliminar mascota', message: `Se eliminará a ${p.name} junto con su historial clínico y vacunas. Esta acción no se puede deshacer.`, confirmText: 'Eliminar', danger: true })) {
      this.pets.remove(p.id); this.toast.success('Mascota eliminada.'); void this.router.navigateByUrl('/admin/mascotas');
    }
  }
  protected print(): void { window.print(); }
}
