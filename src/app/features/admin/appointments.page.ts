import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Appointment, AppointmentStatus, PaymentStatus } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { AppointmentsStore } from '../../core/state/appointments.store';
import { ServicesStore } from '../../core/state/services.store';
import { UiStore } from '../../core/state/ui.store';
import { downloadCsv } from '../../core/utils/csv';
import { formatDate, formatTime, formatTimeRange } from '../../core/utils/date';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { AppointmentDetailModalComponent, AppointmentFormModalComponent } from './appointment-modals.component';

const PAGE_SIZE = 10;
const STATUS_LABEL: Record<AppointmentStatus, string> = { pending: 'Pendiente', confirmed: 'Confirmada', attended: 'Atendida', no_show: 'No asistió', cancelled: 'Cancelada' };

@Component({
  selector: 'app-admin-appointments-page',
  standalone: true,
  imports: [FormsModule, IconComponent, AppointmentFormModalComponent, AppointmentDetailModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './appointments.page.html',
})
export class AdminAppointmentsPage {
  private readonly store = inject(AppointmentsStore);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  protected readonly ui = inject(UiStore);
  protected readonly services = inject(ServicesStore).all;

  protected readonly q = signal('');
  protected readonly status = signal<AppointmentStatus | 'all'>('all');
  protected readonly serviceId = signal('all');
  protected readonly from = signal('');
  protected readonly to = signal('');
  protected readonly page = signal(1);
  protected readonly creating = signal(false);
  protected readonly detailId = signal<string | null>(null);

  protected readonly statuses = Object.entries(STATUS_LABEL) as [AppointmentStatus, string][];
  protected readonly fmtDate = formatDate;
  protected readonly fmtTime = formatTime;
  protected readonly fmtRange = formatTimeRange;

  protected readonly filtered = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.store.all().filter((a) =>
      (!q || [a.code, a.customerName, a.petName, a.serviceName].some((t) => t.toLowerCase().includes(q)))
      && (this.status() === 'all' || a.status === this.status())
      && (this.serviceId() === 'all' || a.serviceId === this.serviceId())
      && (!this.from() || a.date >= this.from())
      && (!this.to() || a.date <= this.to()));
  });
  protected readonly pages = computed(() => Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)));
  protected readonly rows = computed(() => this.filtered().slice((Math.min(this.page(), this.pages()) - 1) * PAGE_SIZE, Math.min(this.page(), this.pages()) * PAGE_SIZE));
  protected readonly total = computed(() => this.filtered().filter((a) => a.payment === 'paid').reduce((s, a) => s + (a.price ?? 0), 0));

  protected setFilter<T>(sig: { set(v: T): void }, v: T): void { sig.set(v); this.page.set(1); }
  protected clear(): void { this.q.set(''); this.status.set('all'); this.serviceId.set('all'); this.from.set(''); this.to.set(''); this.page.set(1); }

  protected async changeStatus(a: Appointment, status: AppointmentStatus): Promise<void> {
    if (status === a.status) return;
    if (status === 'cancelled' && !(await this.confirm.ask({ title: 'Cancelar cita', message: `¿Cancelar la cita ${a.code} de ${a.customerName}? Se liberará el horario.`, confirmText: 'Sí, cancelar', danger: true }))) return;
    this.store.setStatus(a.id, status).subscribe({ next: () => this.toast.success('Estado actualizado.'), error: (e: Error) => this.toast.error(e.message) });
  }

  protected changePayment(a: Appointment, payment: PaymentStatus): void {
    this.store.setPayment(a.id, payment).subscribe(() => this.toast.success(payment === 'paid' ? 'Pago registrado.' : 'Pago marcado como pendiente.'));
  }

  protected exportCsv(): void {
    const rows = this.filtered().map((a) => [a.code, a.date, a.time, a.customerName, a.customerPhone, a.petName, a.serviceName, STATUS_LABEL[a.status], a.payment === 'paid' ? 'Pagado' : 'Pendiente', a.price]);
    downloadCsv(`citas-${new Date().toISOString().slice(0, 10)}.csv`, [['Código', 'Fecha', 'Hora', 'Cliente', 'Teléfono', 'Mascota', 'Servicio', 'Estado', 'Pago', 'Monto (S/)'], ...rows]);
  }
}
