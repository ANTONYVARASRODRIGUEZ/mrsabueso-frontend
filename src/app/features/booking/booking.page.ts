import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Appointment } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { AppointmentsStore } from '../../core/state/appointments.store';
import { PetsStore, petLabel, speciesLabel } from '../../core/state/pets.store';
import { ServicesStore } from '../../core/state/services.store';
import { SettingsStore } from '../../core/state/settings.store';
import { UiStore } from '../../core/state/ui.store';
import { addDays, formatDate, formatTime, toIsoDate, todayIso } from '../../core/utils/date';
import { isIsoDate, nextOpenDate } from '../../core/utils/scheduling';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { SlotPickerComponent } from '../../shared/ui/slot-picker/slot-picker.component';

const STEP_TITLES = ['Mascota', 'Servicio', 'Fecha y hora'] as const;

@Component({
  selector: 'app-booking-page',
  standalone: true,
  imports: [FormsModule, IconComponent, SlotPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './booking.page.html',
  styleUrl: './booking.page.scss',
})
export class BookingPage {
  protected readonly petsStore = inject(PetsStore);
  private readonly apptStore = inject(AppointmentsStore);
  private readonly servicesStore = inject(ServicesStore);
  private readonly settings = inject(SettingsStore);
  private readonly ui = inject(UiStore);
  private readonly toast = inject(ToastService);

  /** Preselección desde la página de servicios: /reservar?servicio=dental */
  readonly servicio = input<string>();

  protected readonly stepTitles = STEP_TITLES;
  protected readonly services = this.servicesStore.bookable;
  protected readonly minDate = todayIso();
  protected readonly maxDate = toIsoDate(addDays(new Date(), 90));
  protected readonly fmtDate = formatDate;
  protected readonly fmtTime = formatTime;
  protected readonly speciesLabel = speciesLabel;

  protected readonly step = signal(1);
  protected readonly petId = signal<string | null>(null);
  protected readonly serviceId = signal<string | null>(null);
  protected readonly date = signal(nextOpenDate(this.settings.settings(), toIsoDate(addDays(new Date(), 1))));
  protected readonly time = signal<string | null>(null);
  protected readonly notes = signal('');
  protected readonly booking = signal(false);
  protected readonly confirmed = signal<Appointment | null>(null);

  protected readonly pet = computed(() => this.petsStore.pets().find((p) => p.id === this.petId()) ?? null);
  protected readonly petName = computed(() => { const p = this.pet(); return p ? petLabel(p) : ''; });
  protected readonly service = computed(() => this.services().find((s) => s.id === this.serviceId()) ?? null);
  protected readonly progress = computed(() => (this.step() / 3) * 100);
  protected readonly dateValid = computed(() => isIsoDate(this.date()) && this.date() >= this.minDate && this.date() <= this.maxDate);
  protected readonly canConfirm = computed(() => this.dateValid() && !!this.time() && !!this.pet() && !!this.service());

  constructor() {
    effect(() => {
      const pets = this.petsStore.pets();
      if (this.petId() === null && pets.length > 0) this.petId.set(pets[0].id);
    });

    effect(() => {
      const created = this.petsStore.lastCreated();
      if (created) this.petId.set(created.id);
    });

    effect(() => {
      const id = this.servicio();
      if (id && this.services().some((s) => s.id === id)) this.serviceId.set(id);
    });
  }

  protected addPet(): void { this.ui.openAddPet(); }
  protected openAccount(): void { this.ui.openAccount(); }
  protected next(): void { if (this.step() < 3) this.step.update((s) => s + 1); }
  protected back(): void { if (this.step() > 1) this.step.update((s) => s - 1); }

  protected confirm(): void {
    const service = this.service();
    const pet = this.pet();
    const time = this.time();
    if (!this.canConfirm() || !service || !pet || !time) return;
    this.booking.set(true);
    this.apptStore.book({ petId: pet.id, serviceId: service.id, date: this.date(), time, notes: this.notes() }).subscribe({
      next: (a) => { this.booking.set(false); this.confirmed.set(a); this.toast.success('¡Tu cita fue reservada!'); },
      error: (e: Error) => { this.booking.set(false); this.time.set(null); this.toast.error(e.message || 'No pudimos reservar tu cita.'); },
    });
  }

  protected whatsappConfirm(a: Appointment): string {
    return this.settings.whatsappLink(`Hola ${this.settings.settings().name}, reservé la cita ${a.code} para ${a.petName}: ${a.serviceName}, ${formatDate(a.date)} a las ${formatTime(a.time)}.`);
  }

  protected reset(): void {
    this.confirmed.set(null);
    this.step.set(1);
    this.serviceId.set(null);
    this.time.set(null);
    this.notes.set('');
  }
}
