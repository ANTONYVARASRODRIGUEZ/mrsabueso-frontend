import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { AppointmentsStore } from '../../core/state/appointments.store';
import { UiStore } from '../../core/state/ui.store';
import { addDays, formatDate, formatTime, toIsoDate, todayIso } from '../../core/utils/date';
import { nextOpenDate } from '../../core/utils/scheduling';
import { SettingsStore } from '../../core/state/settings.store';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { SlotPickerComponent } from '../../shared/ui/slot-picker/slot-picker.component';

@Component({
  selector: 'app-reschedule-modal',
  standalone: true,
  imports: [ModalComponent, SlotPickerComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.rescheduleTarget(); as a) {
      <app-modal heading="Reprogramar cita" width="480px" (closed)="close()">
        <p class="what"><strong>{{ a.serviceName }}</strong> · {{ a.petName }}<br>
          Actual: {{ fmtDate(a.date) }} a las {{ fmtTime(a.time) }}</p>
        <div class="field">
          <label for="rs-date">Nueva fecha</label>
          <input id="rs-date" type="date" class="input" [min]="min" [max]="max" [ngModel]="date()" (ngModelChange)="date.set($event)">
        </div>
        <p class="label">Nuevo horario</p>
        <app-slot-picker [date]="date()" [excludeId]="a.id" [(time)]="time" />
        @if (!auth.isAdmin()) { <p class="note">Al reprogramar, tu cita volverá a quedar pendiente de confirmación.</p> }
        <button type="button" class="btn btn--primary btn--lg btn--block" [disabled]="!canSave() || saving()" (click)="save(a.id)">{{ saving() ? 'Guardando…' : 'Confirmar nuevo horario' }}</button>
      </app-modal>
    }
  `,
  styles: [`.what { margin-bottom: 1.2rem; color: var(--c-ink-2); line-height: 1.5; } .label { margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 600; color: var(--c-ink-2); } .note { margin: 1rem 0; font-size: 0.88rem; color: var(--c-muted); }`],
})
export class RescheduleModalComponent {
  protected readonly ui = inject(UiStore);
  private readonly appts = inject(AppointmentsStore);
  private readonly toast = inject(ToastService);
  protected readonly auth = inject(AuthService);

  protected readonly min = todayIso();
  protected readonly max = toIsoDate(addDays(new Date(), 90));
  private readonly settings = inject(SettingsStore);
  protected readonly date = signal(nextOpenDate(this.settings.settings(), toIsoDate(addDays(new Date(), 1))));
  protected readonly time = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly canSave = computed(() => !!this.time() && this.date() >= this.min && this.date() <= this.max);
  protected readonly fmtDate = formatDate;
  protected readonly fmtTime = formatTime;

  protected close(): void { this.ui.rescheduleTarget.set(null); }

  protected save(id: string): void {
    const time = this.time();
    if (!time) return;
    this.saving.set(true);
    this.appts.reschedule(id, this.date(), time, this.auth.isAdmin()).subscribe({
      next: () => { this.toast.success('Tu cita fue reprogramada.'); this.close(); },
      error: (e: Error) => { this.saving.set(false); this.time.set(null); this.toast.error(e.message); },
    });
  }
}
