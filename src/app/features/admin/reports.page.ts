import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Appointment } from '../../core/models';
import { AppointmentsStore } from '../../core/state/appointments.store';
import { CustomersStore } from '../../core/state/customers.store';
import { PetsStore } from '../../core/state/pets.store';
import { SettingsStore } from '../../core/state/settings.store';
import { downloadCsv } from '../../core/utils/csv';
import { addDays, formatDate, toIsoDate, todayIso } from '../../core/utils/date';
import { IconComponent } from '../../shared/ui/icon/icon.component';

const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

interface Stats { total: number; attended: number; noShow: number; cancelled: number; revenue: number; receivable: number; attendance: number | null; ticket: number; }

function statsOf(list: Appointment[]): Stats {
  const attended = list.filter((a) => a.status === 'attended');
  const noShow = list.filter((a) => a.status === 'no_show').length;
  const paid = attended.filter((a) => a.payment === 'paid');
  const revenue = paid.reduce((s, a) => s + (a.price ?? 0), 0);
  return {
    total: list.filter((a) => a.status !== 'cancelled').length, attended: attended.length, noShow,
    cancelled: list.filter((a) => a.status === 'cancelled').length, revenue,
    receivable: attended.filter((a) => a.payment === 'pending').reduce((s, a) => s + (a.price ?? 0), 0),
    attendance: attended.length + noShow === 0 ? null : Math.round((attended.length / (attended.length + noShow)) * 100),
    ticket: paid.length ? Math.round(revenue / paid.length) : 0,
  };
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reports.page.html',
})
export class ReportsPage {
  private readonly appts = inject(AppointmentsStore);
  private readonly customers = inject(CustomersStore);
  private readonly pets = inject(PetsStore);
  private readonly settings = inject(SettingsStore);

  protected readonly month = signal(todayIso().slice(0, 7));
  protected readonly inactiveDays = signal(90);
  protected readonly fmtDate = formatDate;

  protected readonly monthLabel = computed(() => {
    const [y, m] = this.month().split('-').map(Number);
    return m ? `${MONTH_NAMES[m - 1]} de ${y}` : '';
  });
  private readonly prevPrefix = computed(() => {
    const [y, m] = this.month().split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  private readonly inMonth = computed(() => this.appts.all().filter((a) => a.date.startsWith(this.month())));
  protected readonly stats = computed(() => statsOf(this.inMonth()));
  protected readonly prev = computed(() => statsOf(this.appts.all().filter((a) => a.date.startsWith(this.prevPrefix()))));
  protected readonly newClients = computed(() => this.customers.clients().filter((c) => c.createdAt.startsWith(this.month())).length);

  protected delta(cur: number, prev: number): string {
    if (prev === 0) return cur === 0 ? '—' : 'nuevo';
    const d = Math.round(((cur - prev) / prev) * 100);
    return `${d > 0 ? '+' : ''}${d}% vs. mes anterior`;
  }

  protected readonly byService = computed(() => {
    const map = new Map<string, { name: string; count: number; revenue: number }>();
    for (const a of this.inMonth().filter((x) => x.status === 'attended')) {
      const cur = map.get(a.serviceId) ?? { name: a.serviceName, count: 0, revenue: 0 };
      cur.count++; if (a.payment === 'paid') cur.revenue += a.price ?? 0;
      map.set(a.serviceId, cur);
    }
    const rows = [...map.values()].sort((a, b) => b.revenue - a.revenue || b.count - a.count);
    const max = Math.max(1, ...rows.map((r) => r.revenue));
    return rows.map((r) => ({ ...r, pct: (r.revenue / max) * 100 }));
  });

  /** Clientes con visitas atendidas cuya última visita fue hace más de N días y sin cita próxima. */
  protected readonly inactive = computed(() => {
    const limit = toIsoDate(addDays(new Date(), -this.inactiveDays())); const today = todayIso();
    const all = this.appts.all();
    return this.customers.clients().map((c) => {
      const mine = all.filter((a) => a.userId === c.id);
      const last = mine.filter((a) => a.status === 'attended').map((a) => a.date).sort().pop();
      const hasUpcoming = mine.some((a) => (a.status === 'pending' || a.status === 'confirmed') && a.date >= today);
      const days = last ? Math.floor((Date.now() - new Date(last + 'T12:00:00').getTime()) / 86400000) : 0;
      const petNames = this.pets.ofOwner(c.id).map((p) => p.name).join(', ');
      return { c, last, days, hasUpcoming, petNames };
    }).filter((x) => x.last && x.last < limit && !x.hasUpcoming && x.c.active).sort((a, b) => (a.last ?? '').localeCompare(b.last ?? ''));
  });

  protected reactivate(x: { c: { fullName: string; phone?: string }; petNames: string }): string {
    const name = this.settings.settings().name;
    const text = `Hola ${x.c.fullName.split(' ')[0]}, te extrañamos en ${name}. ¿Agendamos el próximo control${x.petNames ? ' de ' + x.petNames : ''}? Puedes reservar en línea o responder por aquí.`;
    return `https://wa.me/${(x.c.phone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
  }

  protected exportCsv(): void {
    const s = this.stats();
    downloadCsv(`reporte-${this.month()}.csv`, [
      [`Reporte ${this.monthLabel()}`], [],
      ['Indicador', 'Valor'], ['Citas (sin canceladas)', s.total], ['Atendidas', s.attended], ['No asistió', s.noShow], ['Canceladas', s.cancelled],
      ['Asistencia (%)', s.attendance ?? ''], ['Ingresos cobrados (S/)', s.revenue], ['Por cobrar (S/)', s.receivable], ['Ticket promedio (S/)', s.ticket], ['Clientes nuevos', this.newClients()], [],
      ['Servicio', 'Atenciones', 'Ingresos cobrados (S/)'], ...this.byService().map((r) => [r.name, r.count, r.revenue]), [],
      ['Detalle de citas'], ['Código', 'Fecha', 'Hora', 'Cliente', 'Mascota', 'Servicio', 'Estado', 'Pago', 'Monto (S/)'],
      ...this.inMonth().map((a) => [a.code, a.date, a.time, a.customerName, a.petName, a.serviceName, a.status, a.payment, a.price]),
    ]);
  }

  protected exportInactive(): void {
    downloadCsv(`clientes-inactivos-${this.inactiveDays()}d.csv`, [['Cliente', 'Teléfono', 'Correo', 'Mascotas', 'Última visita', 'Días sin venir'],
      ...this.inactive().map((x) => [x.c.fullName, x.c.phone, x.c.email, x.petNames, x.last, x.days])]);
  }

  protected print(): void { window.print(); }
}
