import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AppointmentStatus } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { AppointmentsStore } from '../../core/state/appointments.store';
import { CustomersStore } from '../../core/state/customers.store';
import { MedicalStore, vaccineStatus } from '../../core/state/medical.store';
import { MessagesStore } from '../../core/state/messages.store';
import { PetsStore } from '../../core/state/pets.store';
import { ReviewsStore } from '../../core/state/reviews.store';
import { addDays, formatDate, formatTime, toIsoDate, todayIso } from '../../core/utils/date';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { StarRatingComponent } from '../../shared/ui/star-rating/star-rating.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [RouterLink, IconComponent, StatusBadgeComponent, StarRatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './dashboard.page.html',
})
export class DashboardPage {
  private readonly apptStore = inject(AppointmentsStore);
  private readonly customers = inject(CustomersStore);
  private readonly pets = inject(PetsStore);
  private readonly reviews = inject(ReviewsStore);
  private readonly medical = inject(MedicalStore);
  private readonly messages = inject(MessagesStore);
  private readonly toast = inject(ToastService);

  protected readonly today = todayIso();
  protected readonly fmtDate = formatDate;
  protected readonly fmtTime = formatTime;
  private readonly all = this.apptStore.all;

  protected readonly todayList = computed(() =>
    this.all().filter((a) => a.date === this.today && a.status !== 'cancelled').sort((a, b) => a.time.localeCompare(b.time)));
  protected readonly pendingUpcoming = computed(() => this.all().filter((a) => a.status === 'pending' && a.date >= this.today).length);

  protected readonly monthRevenue = computed(() => {
    const prefix = this.today.slice(0, 7);
    return this.all().filter((a) => a.payment === 'paid' && a.date.startsWith(prefix)).reduce((s, a) => s + (a.price ?? 0), 0);
  });
  protected readonly pendingPayments = computed(() =>
    this.all().filter((a) => a.status === 'attended' && a.payment === 'pending').reduce((s, a) => s + (a.price ?? 0), 0));

  protected readonly attendance = computed(() => {
    const from = toIsoDate(addDays(new Date(), -30));
    const done = this.all().filter((a) => a.date >= from && a.date < this.today);
    const att = done.filter((a) => a.status === 'attended').length;
    const miss = done.filter((a) => a.status === 'no_show').length;
    return att + miss === 0 ? null : Math.round((att / (att + miss)) * 100);
  });

  protected readonly clientCount = computed(() => this.customers.clients().length);
  protected readonly petCount = computed(() => this.pets.all().length);
  protected readonly avgRating = this.reviews.average;

  protected readonly last14 = computed(() => {
    const days = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i - 13));
    const rows = days.map((d) => {
      const iso = toIsoDate(d);
      return { label: `${d.getDate()}/${d.getMonth() + 1}`, value: this.all().filter((a) => a.date === iso && a.status !== 'cancelled').length };
    });
    const max = Math.max(1, ...rows.map((r) => r.value));
    return rows.map((r) => ({ ...r, h: (r.value / max) * 100 }));
  });

  protected readonly revenue6 = computed(() => {
    const now = new Date();
    const rows = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const prefix = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return { label: MONTHS[d.getMonth()], value: this.all().filter((a) => a.payment === 'paid' && a.date.startsWith(prefix)).reduce((s, a) => s + (a.price ?? 0), 0) };
    });
    const max = Math.max(1, ...rows.map((r) => r.value));
    return rows.map((r) => ({ ...r, h: (r.value / max) * 100 }));
  });

  protected readonly topServices = computed(() => {
    const from = toIsoDate(addDays(new Date(), -30));
    const counts = new Map<string, number>();
    this.all().filter((a) => a.date >= from && a.status !== 'cancelled').forEach((a) => counts.set(a.serviceName, (counts.get(a.serviceName) ?? 0) + 1));
    const rows = [...counts].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 5);
    const max = Math.max(1, ...rows.map((r) => r.value));
    return rows.map((r) => ({ ...r, pct: (r.value / max) * 100 }));
  });

  protected readonly dueVaccines = computed(() =>
    this.medical.latestVaccines()
      .map((v) => ({ v, status: vaccineStatus(v), pet: this.pets.byId(v.petId) }))
      .filter((x) => (x.status === 'soon' || x.status === 'overdue') && x.pet)
      .sort((a, b) => (a.v.nextDue ?? '').localeCompare(b.v.nextDue ?? '')).slice(0, 6));

  protected readonly newMessages = computed(() => this.messages.all().filter((m) => m.status === 'new').slice(0, 3));
  protected readonly latestReviews = computed(() => this.reviews.all().slice(0, 3));

  protected setStatus(id: string, status: AppointmentStatus): void {
    this.apptStore.setStatus(id, status).subscribe({ next: () => this.toast.success('Cita actualizada.'), error: (e: Error) => this.toast.error(e.message) });
  }
}
