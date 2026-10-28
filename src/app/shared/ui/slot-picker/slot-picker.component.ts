import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model } from '@angular/core';
import { AppointmentsStore } from '../../../core/state/appointments.store';
import { SettingsStore } from '../../../core/state/settings.store';
import { formatTime, todayIso } from '../../../core/utils/date';
import { isIsoDate, isOpenDay, slotsForDate } from '../../../core/utils/scheduling';

/** Selector de horario reutilizable (reserva, reprogramación y administración). */
@Component({
  selector: 'app-slot-picker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!validDate()) {
      <p class="msg">Elige una fecha válida para ver los horarios.</p>
    } @else if (closed()) {
      <p class="msg msg--closed">Ese día no atendemos. Elige otra fecha.</p>
    } @else if (slots().length === 0) {
      <p class="msg">No hay horarios configurados para ese día.</p>
    } @else {
      <div class="slots" role="radiogroup" aria-label="Horarios disponibles">
        @for (s of slots(); track s.time) {
          <button type="button" role="radio" class="slot" [class.selected]="time() === s.time" [class.busy]="s.busy"
                  [disabled]="s.busy" [attr.aria-checked]="time() === s.time" (click)="time.set(s.time)">
            {{ fmt(s.time) }}@if (s.busy) { <small>Ocupado</small> }
          </button>
        }
      </div>
    }
  `,
  styles: [`
    .slots { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.7rem; }
    .slot { display: grid; padding: 0.7rem 0.3rem; font-weight: 500; text-align: center; background: #fff; border: 1.5px solid var(--c-line); border-radius: var(--radius-sm); transition: all 0.15s;
      &:hover:not(:disabled) { border-color: var(--c-brand); } &.selected { color: #fff; background: var(--c-brand); border-color: var(--c-brand); }
      &.busy { color: #98a2b3; background: #f4f3f0; text-decoration: line-through; cursor: not-allowed; small { text-decoration: none; font-size: 0.7rem; } } }
    .msg { padding: 0.9rem 1rem; color: var(--c-muted); background: var(--c-bg); border-radius: var(--radius-sm); font-size: 0.92rem; &--closed { color: var(--c-danger); background: var(--c-danger-bg); } }
    @media (max-width: 480px) { .slots { grid-template-columns: repeat(2, 1fr); } }
  `],
})
export class SlotPickerComponent {
  private readonly appts = inject(AppointmentsStore);
  private readonly settings = inject(SettingsStore);

  readonly date = input.required<string>();
  /** Cita que se está reprogramando (su horario actual no cuenta como ocupado). */
  readonly excludeId = input<string>();
  readonly time = model<string | null>(null);
  protected readonly fmt = formatTime;

  protected readonly validDate = computed(() => isIsoDate(this.date()) && this.date() >= todayIso());
  protected readonly closed = computed(() => this.validDate() && !isOpenDay(this.settings.settings(), this.date()));
  protected readonly slots = computed(() =>
    slotsForDate(this.settings.settings(), this.date()).map((t) => ({ time: t, busy: !this.appts.isSlotFree(this.date(), t, this.excludeId()) })));

  constructor() {
    // Si el horario elegido deja de estar disponible (cambio de fecha), se limpia.
    effect(() => {
      const t = this.time();
      if (t && !this.slots().some((s) => s.time === t && !s.busy)) this.time.set(null);
    });
  }
}
