import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { AppointmentStatus, PaymentStatus } from '../../../core/models';

const MAP: Record<string, { label: string; tone: string }> = {
  pending: { label: 'Pendiente', tone: 'warn' },
  confirmed: { label: 'Confirmada', tone: 'info' },
  attended: { label: 'Atendida', tone: 'success' },
  no_show: { label: 'No asistió', tone: 'danger' },
  cancelled: { label: 'Cancelada', tone: 'danger' },
  'pay:pending': { label: 'Pago pendiente', tone: 'warn' },
  'pay:paid': { label: 'Pagado', tone: 'success' },
};

@Component({
  selector: 'app-status-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="badge" [class]="'badge badge--' + cfg().tone">{{ cfg().label }}</span>`,
})
export class StatusBadgeComponent {
  readonly status = input<AppointmentStatus>();
  readonly payment = input<PaymentStatus>();
  protected readonly cfg = computed(() => {
    const p = this.payment();
    return MAP[p ? `pay:${p}` : (this.status() ?? 'pending')];
  });
}
