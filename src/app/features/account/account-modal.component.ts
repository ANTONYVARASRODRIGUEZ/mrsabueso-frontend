import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Appointment } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { AppointmentsStore } from '../../core/state/appointments.store';
import { PetsStore, speciesLabel } from '../../core/state/pets.store';
import { ReviewsStore } from '../../core/state/reviews.store';
import { UiStore } from '../../core/state/ui.store';
import { formatDate, formatTime, todayIso } from '../../core/utils/date';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { StarRatingComponent } from '../../shared/ui/star-rating/star-rating.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-account-modal',
  standalone: true,
  imports: [ModalComponent, IconComponent, StatusBadgeComponent, StarRatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './account-modal.component.html',
  styleUrl: './account-modal.component.scss',
})
export class AccountModalComponent {
  protected readonly auth = inject(AuthService);
  protected readonly petsStore = inject(PetsStore);
  protected readonly apptStore = inject(AppointmentsStore);
  protected readonly reviews = inject(ReviewsStore);
  protected readonly ui = inject(UiStore);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmService);
  private readonly router = inject(Router);

  protected readonly cancellingId = signal<string | null>(null);
  protected readonly fmtDate = formatDate;
  protected readonly fmtTime = formatTime;
  protected readonly speciesLabel = speciesLabel;
  protected readonly total = computed(() => this.apptStore.mine().length);

  protected isUpcoming(a: Appointment): boolean {
    return (a.status === 'pending' || a.status === 'confirmed') && a.date >= todayIso();
  }

  protected reviewOf(a: Appointment) { return this.reviews.forAppointment(a.id); }

  protected async cancel(a: Appointment): Promise<void> {
    const ok = await this.confirmDialog.ask({
      title: 'Cancelar cita', message: `¿Seguro que quieres cancelar la cita ${a.code} del ${formatDate(a.date)} a las ${formatTime(a.time)}?`,
      confirmText: 'Sí, cancelar', danger: true,
    });
    if (!ok) return;
    this.cancellingId.set(a.id);
    this.apptStore.cancel(a.id).subscribe({
      next: () => { this.cancellingId.set(null); this.toast.success('Tu cita fue cancelada.'); },
      error: (e: Error) => { this.cancellingId.set(null); this.toast.error(e.message); },
    });
  }

  protected logout(): void {
    this.auth.logout();
    this.ui.closeAccount();
    this.toast.show('Cerraste sesión.', 'info');
    void this.router.navigateByUrl('/');
  }

  protected close(): void { this.ui.closeAccount(); }
}
