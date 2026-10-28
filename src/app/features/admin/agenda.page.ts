import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Appointment } from '../../core/models';
import { AppointmentsStore } from '../../core/state/appointments.store';
import { SettingsStore } from '../../core/state/settings.store';
import { addDays, formatTime, formatTimeRange, toIsoDate, todayIso } from '../../core/utils/date';
import { dayOfWeek, isOpenDay, slotsForDate } from '../../core/utils/scheduling';
import { DAY_NAMES } from '../../core/config/business';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { AppointmentDetailModalComponent } from './appointment-modals.component';

function mondayOf(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  copy.setDate(copy.getDate() - ((copy.getDay() + 6) % 7));
  return copy;
}

@Component({
  selector: 'app-agenda-page',
  standalone: true,
  imports: [IconComponent, AppointmentDetailModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div><h1>Agenda semanal</h1><p>{{ rangeLabel() }} · {{ weekCount() }} citas</p></div>
      <div class="actions">
        <button type="button" class="btn btn--outline btn--sm" (click)="shift(-1)" aria-label="Semana anterior"><app-icon name="arrow-right" class="flip" /></button>
        <button type="button" class="btn btn--outline btn--sm" (click)="goToday()">Hoy</button>
        <button type="button" class="btn btn--outline btn--sm" (click)="shift(1)" aria-label="Semana siguiente"><app-icon name="arrow-right" /></button>
      </div>
    </header>

    <section class="adm-card">
      <div class="legend"><span class="ev ev--pending">Pendiente</span><span class="ev ev--confirmed">Confirmada</span><span class="ev ev--attended">Atendida</span><span class="ev ev--no_show">No asistió</span></div>
      <div class="adm-table-wrap">
        <table class="grid">
          <thead><tr><th></th>@for (d of days(); track d.iso) { <th [class.today]="d.today" [class.closed]="!d.open">{{ d.name }}<small>{{ d.label }}</small></th> }</tr></thead>
          <tbody>
            @for (t of times(); track t) {
              <tr><th class="hour">{{ fmt(t) }}</th>
                @for (d of days(); track d.iso) {
                  <td [class.closed]="!d.open || !d.slots.includes(t)" [class.today]="d.today">
                    @if (cell(d.iso, t); as a) {
                      <button type="button" class="ev" [class]="'ev ev--' + a.status" (click)="detailId.set(a.id)"><strong>{{ a.petName }}</strong><span>{{ a.serviceName }}</span><small class="ev__t">{{ range(a.time, a.endTime) }}</small></button>
                    }
                  </td>
                }
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    @if (detailId(); as id) { <app-appointment-detail-modal [appointmentId]="id" (closed)="detailId.set(null)" /> }
  `,
  styles: [`
    .grid { width: 100%; min-width: 760px; border-collapse: separate; border-spacing: 4px; table-layout: fixed;
      th { padding: 0.4rem; font-size: 0.8rem; text-align: center; color: var(--c-ink-2); small { display: block; font-weight: 500; color: var(--c-muted); } &.today { color: var(--c-brand-600); } &.closed { color: var(--c-muted); } }
      .hour { width: 76px; text-align: right; font-size: 0.78rem; color: var(--c-muted); white-space: nowrap; }
      td { height: 78px; padding: 3px; vertical-align: top; background: #faf9f6; border: 1px solid #efede8; border-radius: 8px; &.closed { background: repeating-linear-gradient(45deg, #f4f3ef, #f4f3ef 6px, #efede8 6px, #efede8 12px); } &.today { border-color: var(--c-brand-100); } } }
    .ev { display: grid; gap: 0.05rem; width: 100%; padding: 0.35rem 0.5rem; text-align: left; font-size: 0.78rem; line-height: 1.25; border: 0; border-left: 4px solid; border-radius: 6px; overflow: hidden; cursor: pointer;
      strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; opacity: 0.85; }
      &--pending { color: #7a5b00; background: #fff2cf; border-color: #e0a800; } &--confirmed { color: #1d4ed8; background: #e6eeff; border-color: #3b6fe0; }
      &--attended { color: #16794c; background: #e3f6ec; border-color: #2fa86b; } &--no_show { color: #b42318; background: #fde8e6; border-color: #e5484d; } }
    .legend { display: flex; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.8rem; .ev { width: auto; display: inline-block; cursor: default; } }
    .flip { transform: rotate(180deg); }
    .ev__t { display: block; margin-top: 1px; font-size: 0.7rem; font-weight: 600; opacity: 0.8; white-space: nowrap; }
  `],
})
export class AgendaPage {
  private readonly appts = inject(AppointmentsStore);
  private readonly settings = inject(SettingsStore);

  protected readonly weekStart = signal(mondayOf(new Date()));
  protected readonly detailId = signal<string | null>(null);
  protected readonly fmt = formatTime;
  protected readonly range = formatTimeRange;

  protected readonly days = computed(() => Array.from({ length: 7 }, (_, i) => {
    const d = addDays(this.weekStart(), i);
    const iso = toIsoDate(d);
    return { iso, name: DAY_NAMES[dayOfWeek(iso)].slice(0, 3), label: `${d.getDate()}/${d.getMonth() + 1}`, today: iso === todayIso(), open: isOpenDay(this.settings.settings(), iso), slots: slotsForDate(this.settings.settings(), iso) };
  }));
  /** Horas dentro del horario de atención de la semana, más las de citas ya agendadas fuera de él. */
  protected readonly times = computed(() =>
    [...new Set([...this.days().flatMap((d) => d.slots), ...this.weekAppts().map((a) => a.time)])].sort());
  private readonly weekAppts = computed(() => {
    const isos = new Set(this.days().map((d) => d.iso));
    return this.appts.all().filter((a) => isos.has(a.date) && a.status !== 'cancelled');
  });
  protected readonly weekCount = computed(() => this.weekAppts().length);
  protected readonly rangeLabel = computed(() => {
    const d = this.days();
    return `${d[0].label} – ${d[6].label}`;
  });

  protected cell(iso: string, time: string): Appointment | undefined { return this.weekAppts().find((a) => a.date === iso && a.time === time); }
  protected shift(weeks: number): void { this.weekStart.update((d) => addDays(d, weeks * 7)); }
  protected goToday(): void { this.weekStart.set(mondayOf(new Date())); }
}
