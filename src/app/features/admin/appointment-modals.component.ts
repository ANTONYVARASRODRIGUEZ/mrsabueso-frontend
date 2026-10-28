import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PetSpecies } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { AppointmentsStore } from '../../core/state/appointments.store';
import { CustomersStore } from '../../core/state/customers.store';
import { PetsStore } from '../../core/state/pets.store';
import { ReviewsStore } from '../../core/state/reviews.store';
import { ServicesStore } from '../../core/state/services.store';
import { SettingsStore } from '../../core/state/settings.store';
import { addDays, formatDate, formatTime, formatTimeRange, toIsoDate, todayIso } from '../../core/utils/date';
import { nextOpenDate } from '../../core/utils/scheduling';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { SlotPickerComponent } from '../../shared/ui/slot-picker/slot-picker.component';
import { StarRatingComponent } from '../../shared/ui/star-rating/star-rating.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';

/** Alta de cita a nombre de un cliente (llamadas, WhatsApp o presencial). */
@Component({
  selector: 'app-appointment-form-modal',
  standalone: true,
  imports: [ModalComponent, FormsModule, SlotPickerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal heading="Nueva cita" width="620px" (closed)="closed.emit()">
      <div class="form-grid">
        <div class="field full"><label for="n-cust">Cliente</label>
          @if (!newCustomer()) {
            <select id="n-cust" class="input" [ngModel]="userId()" (ngModelChange)="userId.set($event); petId.set('')">
              <option value="">Selecciona un cliente…</option>
              @for (c of customers.clients(); track c.id) { <option [value]="c.id">{{ c.fullName }}{{ c.email ? ' — ' + c.email : '' }}</option> }
            </select>
            <button type="button" class="linkbtn" (click)="startNewCustomer()">+ Registrar cliente nuevo (no tiene cuenta)</button>
          } @else {
            <div class="inline2">
              <input class="input" placeholder="Nombre completo" aria-label="Nombre del cliente" [ngModel]="cName()" (ngModelChange)="cName.set($event)">
              <input class="input" placeholder="Teléfono / WhatsApp" aria-label="Teléfono del cliente" inputmode="tel" [ngModel]="cPhone()" (ngModelChange)="cPhone.set($event)">
              <input class="input full" type="email" placeholder="Correo (opcional)" aria-label="Correo del cliente" [ngModel]="cEmail()" (ngModelChange)="cEmail.set($event)">
            </div>
            @if (duplicate(); as d) {
              <div class="dup" role="alert"><strong>Ya existe un cliente con este teléfono:</strong> {{ d.fullName }}
                <div class="dup__acts"><button type="button" class="btn btn--primary btn--sm" (click)="useExisting(d.id)">Usar a {{ d.fullName }}</button>
                  <label class="switch"><input type="checkbox" [checked]="sameOk()" (change)="sameOk.set(!sameOk())"> Es otra persona, crear igual</label></div></div>
            }
            <label class="switch consent"><input type="checkbox" [checked]="consent()" (change)="consent.set(!consent())">
              <span>El cliente aceptó el tratamiento de sus datos personales para gestionar sus citas e historial.</span></label>
            <small class="hint">Con correo, el cliente podrá activar su cuenta desde “¿Olvidaste tu contraseña?”.</small>
            <button type="button" class="linkbtn" (click)="newCustomer.set(false)">Elegir un cliente existente</button>
          }
        </div>

        @if (userId() || newCustomer()) {
          <div class="field full"><span class="label">Mascota</span>
            @if (ownerPets().length > 0 && !newPet()) {
              <select class="input" aria-label="Mascota" [ngModel]="petId()" (ngModelChange)="petId.set($event)">
                <option value="">Selecciona una mascota…</option>
                @for (p of ownerPets(); track p.id) { <option [value]="p.id">{{ p.name }} ({{ p.breed }})</option> }
              </select>
              <button type="button" class="linkbtn" (click)="newPet.set(true)">+ Registrar una mascota nueva</button>
            } @else {
              <div class="inline">
                <input class="input" placeholder="Nombre" aria-label="Nombre de la mascota" [ngModel]="pName()" (ngModelChange)="pName.set($event)">
                <select class="input" aria-label="Tipo" [ngModel]="pSpecies()" (ngModelChange)="pSpecies.set($event)"><option value="dog">Perro</option><option value="cat">Gato</option><option value="other">Otro</option></select>
                <input class="input" placeholder="Raza" aria-label="Raza" [ngModel]="pBreed()" (ngModelChange)="pBreed.set($event)">
              </div>
              @if (ownerPets().length > 0) { <button type="button" class="linkbtn" (click)="newPet.set(false)">Elegir una mascota existente</button> }
            }
          </div>
        }

        <div class="field"><label for="n-svc">Servicio</label>
          <select id="n-svc" class="input" [ngModel]="serviceId()" (ngModelChange)="serviceId.set($event)">
            <option value="">Selecciona…</option>
            @for (s of services.bookable(); track s.id) { <option [value]="s.id">{{ s.name }} (S/ {{ s.priceFrom }})</option> }
          </select></div>
        <div class="field"><label for="n-date">Fecha</label>
          <input id="n-date" type="date" class="input" [min]="min" [ngModel]="date()" (ngModelChange)="date.set($event)"></div>

        <div class="field full"><span class="label">Horario</span><app-slot-picker [date]="date()" [(time)]="time" /></div>

        <div class="field"><label for="n-st">Estado inicial</label>
          <select id="n-st" class="input" [ngModel]="status()" (ngModelChange)="status.set($event)"><option value="confirmed">Confirmada</option><option value="pending">Pendiente</option></select></div>
        <div class="field full"><label for="n-notes">Notas <span class="hint">(opcional)</span></label>
          <textarea id="n-notes" class="input" maxlength="300" [ngModel]="notes()" (ngModelChange)="notes.set($event)"></textarea></div>
      </div>
      <div class="foot"><button type="button" class="btn btn--outline" (click)="closed.emit()">Cancelar</button>
        <button type="button" class="btn btn--primary" [disabled]="!valid() || saving()" (click)="save()">{{ saving() ? 'Guardando…' : 'Crear cita' }}</button></div>
    </app-modal>
  `,
  styles: [`
    .inline2 { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; .full { grid-column: 1 / -1; } } @media (max-width: 560px) { .inline2 { grid-template-columns: 1fr; } }
    .dup { padding: 0.7rem 0.9rem; font-size: 0.9rem; color: var(--c-warn); background: var(--c-warn-bg); border-radius: var(--radius-sm); &__acts { display: flex; flex-wrap: wrap; gap: 0.6rem 1rem; align-items: center; margin-top: 0.5rem; } }
    .consent { align-items: flex-start; margin-top: 0.3rem; font-size: 0.88rem; input { margin-top: 0.2rem; } }
    .inline { display: grid; grid-template-columns: 1.2fr 0.8fr 1fr; gap: 0.5rem; } .linkbtn { justify-self: start; padding: 0; font-size: 0.85rem; font-weight: 600; color: var(--c-brand-600); background: none; border: 0; &:hover { text-decoration: underline; } }
    .end__row { display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap; .input { width: auto; } } .end__from { font-size: 0.9rem; color: var(--c-muted); }
    .foot { display: flex; justify-content: flex-end; gap: 0.7rem; margin-top: 0.8rem; } @media (max-width: 560px) { .inline { grid-template-columns: 1fr; } }
  `],
})
export class AppointmentFormModalComponent {
  protected readonly customers = inject(CustomersStore);
  protected readonly services = inject(ServicesStore);
  private readonly pets = inject(PetsStore);
  private readonly appts = inject(AppointmentsStore);
  private readonly toast = inject(ToastService);

  readonly closed = output<void>();
  protected readonly min = todayIso();
  protected readonly userId = signal('');
  protected readonly newCustomer = signal(false);
  protected readonly cName = signal('');
  protected readonly cPhone = signal('');
  protected readonly cEmail = signal('');
  protected readonly consent = signal(false);
  protected readonly sameOk = signal(false);
  protected readonly petId = signal('');
  protected readonly newPet = signal(false);
  protected readonly pName = signal('');
  protected readonly pSpecies = signal<PetSpecies>('dog');
  protected readonly pBreed = signal('');
  protected readonly serviceId = signal('');
  private readonly settings = inject(SettingsStore);
  protected readonly date = signal(nextOpenDate(this.settings.settings(), toIsoDate(addDays(new Date(), 1))));
  protected readonly time = signal<string | null>(null);
  protected readonly status = signal<'confirmed' | 'pending'>('confirmed');
  protected readonly notes = signal('');
  protected readonly saving = signal(false);

  protected readonly ownerPets = computed(() => (this.userId() ? this.pets.ofOwner(this.userId()) : []));
  protected readonly creatingPet = computed(() => this.newPet() || this.ownerPets().length === 0);
  protected readonly duplicate = computed(() => (this.newCustomer() ? this.customers.findByPhone(this.cPhone()) : undefined));
  protected readonly customerOk = computed(() => this.newCustomer()
    ? this.consent() && (!this.duplicate() || this.sameOk()) && this.cName().trim().length >= 3 && /^\+?[0-9][0-9\s-]{6,14}$/.test(this.cPhone().trim()) && (!this.cEmail().trim() || /^\S+@\S+\.\S+$/.test(this.cEmail().trim()))
    : !!this.userId());
  protected readonly valid = computed(() =>
    this.customerOk() && !!this.serviceId() && !!this.time() && (this.creatingPet() ? this.pName().trim().length > 0 : !!this.petId()));

  protected startNewCustomer(): void { this.userId.set(''); this.petId.set(''); this.newCustomer.set(true); }
  protected useExisting(id: string): void { this.newCustomer.set(false); this.userId.set(id); this.petId.set(''); this.consent.set(false); this.sameOk.set(false); }

  protected save(): void {
    const time = this.time();
    if (!this.valid() || !time) return;
    this.saving.set(true);
    if (this.newCustomer()) {
      this.customers.create({ fullName: this.cName(), phone: this.cPhone(), email: this.cEmail(), consent: this.consent() }).subscribe({
        next: (c) => { this.userId.set(c.id); this.newCustomer.set(false); this.continueSave(c.id, time); },
        error: (e: Error) => { this.saving.set(false); this.toast.error(e.message); },
      });
    } else { this.continueSave(this.userId(), time); }
  }

  private continueSave(ownerId: string, time: string): void {
    const book = (petId: string): void => {
      this.appts.adminCreate(ownerId, { petId, serviceId: this.serviceId(), date: this.date(), time, notes: this.notes() }, this.status()).subscribe({
        next: (a) => { this.toast.success(`Cita ${a.code} creada.`); this.closed.emit(); },
        error: (e: Error) => { this.saving.set(false); this.time.set(null); this.toast.error(e.message); },
      });
    };
    if (this.creatingPet()) {
      this.pets.add({ name: this.pName().trim(), species: this.pSpecies(), breed: this.pBreed().trim() || 'Mestizo' }, ownerId).subscribe({
        next: (p) => book(p.id), error: (e: Error) => { this.saving.set(false); this.toast.error(e.message); },
      });
    } else { book(this.petId()); }
  }
}

/** Detalle de una cita: datos, notas internas, contacto y reseña. */
@Component({
  selector: 'app-appointment-detail-modal',
  standalone: true,
  imports: [ModalComponent, FormsModule, StatusBadgeComponent, StarRatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (appt(); as a) {
      <app-modal [heading]="'Cita ' + a.code" width="560px" (closed)="closed.emit()">
        <div class="badges"><app-status-badge [status]="a.status" /><app-status-badge [payment]="a.payment" /></div>
        <dl class="dl">
          <dt>Cliente</dt><dd>{{ a.customerName }}@if (a.customerPhone) { <small>{{ a.customerPhone }}</small> }</dd>
          <dt>Mascota</dt><dd>{{ a.petName }}</dd>
          <dt>Servicio</dt><dd>{{ a.serviceName }}@if (a.price) { · S/ {{ a.price }} }</dd>
          <dt>Fecha</dt><dd>{{ fmtDate(a.date) }} · {{ fmtRange(a.time, a.endTime) }}</dd>
          <dt>Reprogramaciones</dt><dd>{{ a.rescheduleCount }}</dd>
          <dt>Creada</dt><dd>{{ fmtDate(a.createdAt.slice(0, 10)) }}</dd>
        </dl>
        @if (review(); as r) { <div class="rev"><app-star-rating [value]="r.rating" [readonly]="true" /><p>“{{ r.comment }}”</p></div> }
        <div class="field end"><label for="d-end">Hora de fin</label>
          <div class="end__row">
            <span class="end__from">Inicio {{ fmtTime(a.time) }} →</span>
            <input id="d-end" type="time" class="input" step="300" [min]="a.time" [ngModel]="endTime()" (ngModelChange)="endTime.set($event)">
            <button type="button" class="btn btn--outline btn--sm" [disabled]="!endTime() || endTime() === a.endTime" (click)="saveEnd(a.id)">Guardar</button>
          </div>
          <span class="hint">Por defecto: inicio + duración del servicio. Ajústala si la atención tomó más o menos tiempo.</span></div>
        <div class="field"><label for="d-notes">Notas internas</label>
          <textarea id="d-notes" class="input" maxlength="300" [ngModel]="notes()" (ngModelChange)="notes.set($event)"></textarea></div>
        <div class="foot">
          @if (a.customerPhone) { <a class="btn btn--whatsapp btn--sm" [href]="wa(a.customerPhone, a.code)" target="_blank" rel="noopener">WhatsApp al cliente</a> }
          <span class="sp"></span>
          <button type="button" class="btn btn--primary" (click)="saveNotes(a.id)">Guardar notas</button>
        </div>
      </app-modal>
    }
  `,
  styles: [`
    .badges { display: flex; gap: 0.5rem; margin-bottom: 1rem; } .dl { display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1.2rem; margin: 0 0 1.2rem; font-size: 0.93rem; dt { color: var(--c-muted); } dd { margin: 0; } small { display: block; color: var(--c-muted); } }
    .rev { margin-bottom: 1rem; padding: 0.8rem 1rem; background: var(--c-brand-50); border-radius: var(--radius-sm); p { margin-top: 0.3rem; font-size: 0.92rem; } }
    .foot { display: flex; align-items: center; gap: 0.7rem; flex-wrap: wrap; } .sp { flex: 1; }
  `],
})
export class AppointmentDetailModalComponent {
  private readonly appts = inject(AppointmentsStore);
  private readonly reviews = inject(ReviewsStore);
  private readonly settings = inject(SettingsStore);
  private readonly toast = inject(ToastService);

  readonly appointmentId = input.required<string>();
  readonly closed = output<void>();
  protected readonly fmtDate = formatDate;
  protected readonly fmtTime = formatTime;
  protected readonly appt = computed(() => this.appts.all().find((a) => a.id === this.appointmentId()) ?? null);
  protected readonly review = computed(() => this.reviews.forAppointment(this.appointmentId()));
  protected readonly notes = signal('');
  protected readonly endTime = signal('');
  protected readonly fmtRange = formatTimeRange;

  constructor() {
    queueMicrotask(() => { this.notes.set(this.appt()?.notes ?? ''); this.endTime.set(this.appt()?.endTime ?? ''); });
  }

  protected wa(phone: string, code: string): string {
    const base = this.settings.settings();
    return `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, te escribimos de ${base.name} sobre tu cita ${code}.`)}`;
  }

  protected saveEnd(id: string): void {
    this.appts.setEndTime(id, this.endTime()).subscribe({
      next: () => this.toast.success('Hora de fin actualizada.'),
      error: (e: Error) => this.toast.error(e.message),
    });
  }

  protected saveNotes(id: string): void {
    this.appts.setNotes(id, this.notes()).subscribe(() => this.toast.success('Notas guardadas.'));
  }
}

