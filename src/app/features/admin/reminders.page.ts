import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppointmentsStore } from '../../core/state/appointments.store';
import { CustomersStore } from '../../core/state/customers.store';
import { MedicalStore, vaccineStatus } from '../../core/state/medical.store';
import { PetsStore } from '../../core/state/pets.store';
import { SettingsStore } from '../../core/state/settings.store';
import { addDays, formatDate, formatTime, toIsoDate, todayIso } from '../../core/utils/date';
import { renderTemplate } from '../../core/utils/template';
import { Appointment, Vaccination } from '../../core/models';
import { IconComponent } from '../../shared/ui/icon/icon.component';

const waLink = (phone: string | undefined, text: string): string => `https://wa.me/${(phone ?? '').replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
const sentLabel = (iso?: string): string => (iso ? `Enviado el ${formatDate(iso.slice(0, 10))}` : '');

@Component({
  selector: 'app-reminders-page',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div><h1>Recordatorios</h1><p>Avisa a tus clientes por WhatsApp con un clic. El mensaje sale redactado; solo lo envías.</p></div>
      <div class="actions"><a routerLink="/admin/configuracion" class="btn btn--outline btn--sm">Editar mensajes</a></div>
    </header>

    <section class="adm-card">
      <div class="adm-card__head"><h2>Citas próximas</h2>
        <label class="f inl">Mostrar<select class="input sel" [ngModel]="days()" (ngModelChange)="days.set(+$event)"><option [ngValue]="1">Hoy y mañana</option><option [ngValue]="3">Próximos 3 días</option><option [ngValue]="7">Próximos 7 días</option></select></label></div>
      @if (appts().length === 0) { <p class="adm-empty">No hay citas en ese período.</p> } @else {
        <ul class="adm-list">@for (a of appts(); track a.id) {
          <li><span class="time">{{ fmtDate(a.date) }}<small>{{ fmtTime(a.time) }}</small></span>
            <div class="grow"><strong>{{ a.customerName }}</strong> · {{ a.petName }}<small>{{ a.serviceName }}{{ a.customerPhone ? ' · ' + a.customerPhone : '' }}</small></div>
            @if (a.reminderSentAt) { <span class="badge badge--success">{{ sent(a.reminderSentAt) }}</span> }
            @if (a.customerPhone) {
              <a class="btn btn--whatsapp btn--sm" [href]="apptLink(a)" target="_blank" rel="noopener" (click)="markAppt(a)"><app-icon name="whatsapp" /> {{ a.reminderSentAt ? 'Reenviar' : 'Enviar recordatorio' }}</a>
            } @else { <span class="badge badge--warn">Sin teléfono</span> }
          </li>
        }</ul>
      }
    </section>

    <section class="adm-card" style="margin-top:1.1rem">
      <div class="adm-card__head"><h2>Vacunas por vencer o vencidas</h2>
        <label class="switch"><input type="checkbox" [checked]="hideDone()" (change)="hideDone.set(!hideDone())"> Ocultar ya avisados</label></div>
      @if (vaccines().length === 0) { <p class="adm-empty">No hay vacunas pendientes de aviso. 🎉</p> } @else {
        <ul class="adm-list">@for (x of vaccines(); track x.v.id) {
          <li><span class="badge" [class]="'badge ' + (x.status === 'overdue' ? 'badge--danger' : 'badge--warn')">{{ x.status === 'overdue' ? 'Vencida' : 'Por vencer' }}</span>
            <div class="grow"><strong>{{ x.petName }}</strong> · {{ x.v.vaccine }}<small>{{ x.owner }}{{ x.phone ? ' · ' + x.phone : '' }} · Próxima dosis: {{ fmtDate(x.v.nextDue!) }}</small></div>
            @if (x.v.reminderSentAt) { <span class="badge badge--success">{{ sent(x.v.reminderSentAt) }}</span> }
            @if (x.phone) {
              <a class="btn btn--whatsapp btn--sm" [href]="vaccineLink(x)" target="_blank" rel="noopener" (click)="markVaccine(x.v)"><app-icon name="whatsapp" /> {{ x.v.reminderSentAt ? 'Reenviar' : 'Avisar' }}</a>
            } @else { <span class="badge badge--warn">Sin teléfono</span> }
          </li>
        }</ul>
      }
    </section>
  `,
  styles: [`.inl { display: inline-flex; align-items: center; gap: 0.6rem; } .time small { display: block; font-weight: 500; color: var(--c-muted); }`],
})
export class RemindersPage {
  private readonly apptStore = inject(AppointmentsStore);
  private readonly medical = inject(MedicalStore);
  private readonly pets = inject(PetsStore);
  private readonly customers = inject(CustomersStore);
  private readonly settings = inject(SettingsStore);

  protected readonly days = signal(1);
  protected readonly hideDone = signal(false);
  protected readonly fmtDate = formatDate;
  protected readonly fmtTime = formatTime;
  protected readonly sent = sentLabel;

  protected readonly appts = computed(() => {
    const today = todayIso(); const to = toIsoDate(addDays(new Date(), this.days()));
    return this.apptStore.all().filter((a) => (a.status === 'pending' || a.status === 'confirmed') && a.date >= today && a.date <= to)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  });

  protected readonly vaccines = computed(() => this.medical.latestVaccines()
    .map((v) => {
      const pet = this.pets.byId(v.petId); const owner = pet ? this.customers.byId(pet.ownerId) : undefined;
      return { v, status: vaccineStatus(v), petName: pet?.name ?? '—', owner: owner?.fullName ?? '—', phone: owner?.phone };
    })
    .filter((x) => (x.status === 'soon' || x.status === 'overdue') && (!this.hideDone() || !x.v.reminderSentAt))
    .sort((a, b) => (a.v.nextDue ?? '').localeCompare(b.v.nextDue ?? '')));

  protected apptLink(a: Appointment): string {
    const s = this.settings.settings();
    return waLink(a.customerPhone, renderTemplate(s.apptReminderTemplate, {
      cliente: a.customerName.split(' ')[0], mascota: a.petName.replace(/\s*\(.*\)$/, ''), servicio: a.serviceName,
      fecha: formatDate(a.date), hora: formatTime(a.time), negocio: s.name,
    }));
  }

  protected vaccineLink(x: { v: Vaccination; status: string; petName: string; owner: string; phone?: string }): string {
    const s = this.settings.settings();
    return waLink(x.phone, renderTemplate(s.vaccineReminderTemplate, {
      cliente: x.owner.split(' ')[0], mascota: x.petName, vacuna: x.v.vaccine, estado: x.status === 'overdue' ? 'venció el' : 'vence el',
      fecha: formatDate(x.v.nextDue ?? ''), negocio: s.name,
    }));
  }

  protected markAppt(a: Appointment): void { this.apptStore.markReminderSent(a.id); }
  protected markVaccine(v: Vaccination): void { this.medical.markVaccineReminded(v.id); }
}
