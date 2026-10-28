import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { startWith } from 'rxjs';
import { RouterLink } from '@angular/router';
import { User } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { AppointmentsStore } from '../../core/state/appointments.store';
import { CustomersStore } from '../../core/state/customers.store';
import { PetsStore, speciesLabel } from '../../core/state/pets.store';
import { downloadCsv } from '../../core/utils/csv';
import { formatDate, formatTime } from '../../core/utils/date';
import { noBlank, phoneValidator } from '../../core/validators/validators';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ImportCustomersModalComponent } from './import-customers-modal.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { StatusBadgeComponent } from '../../shared/ui/status-badge/status-badge.component';

@Component({
  selector: 'app-customers-page',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, RouterLink, IconComponent, ImportCustomersModalComponent, ModalComponent, StatusBadgeComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div><h1>Clientes</h1><p>{{ filtered().length }} de {{ store.clients().length }} clientes</p></div>
      <div class="actions"><button type="button" class="btn btn--outline" (click)="exportCsv()"><app-icon name="download" /> Exportar CSV</button>
        <button type="button" class="btn btn--outline" (click)="importing.set(true)"><app-icon name="download" class="up" /> Importar CSV</button>
        <button type="button" class="btn btn--primary" (click)="openNew()"><app-icon name="plus" /> Nuevo cliente</button></div>
    </header>

    <section class="adm-card">
      <div class="adm-filters"><label class="f search">Buscar<app-icon name="search" /><input class="input" placeholder="Nombre, correo o teléfono" [ngModel]="q()" (ngModelChange)="q.set($event)"></label></div>
      @if (filtered().length === 0) { <p class="adm-empty">No se encontraron clientes.</p> } @else {
        <div class="adm-table-wrap"><table class="adm-table">
          <thead><tr><th>Cliente</th><th>Contacto</th><th class="num">Mascotas</th><th class="num">Citas</th><th>Registro</th><th>Estado</th><th></th></tr></thead>
          <tbody>@for (c of filtered(); track c.id) {
            <tr><td><strong>{{ c.fullName }}</strong></td>
              <td>{{ c.email }}@if (c.phone) { <small>{{ c.phone }}</small> }</td>
              <td class="num">{{ petCount(c.id) }}</td><td class="num">{{ apptCount(c.id) }}</td>
              <td class="nowrap">{{ fmtDate(c.createdAt.slice(0, 10)) }}</td>
              <td><span class="badge" [class]="'badge ' + (c.active ? 'badge--success' : 'badge--danger')">{{ c.active ? 'Activo' : 'Bloqueado' }}</span></td>
              <td><span class="row-actions"><button type="button" class="btn btn--outline btn--sm" (click)="selectedId.set(c.id)">Ver ficha</button></span></td></tr>
          }</tbody></table></div>
      }
    </section>

    @if (importing()) { <app-import-customers-modal (closed)="importing.set(false)" /> }

    @if (adding()) {
      <app-modal heading="Nuevo cliente" width="480px" (closed)="adding.set(false)">
        <form [formGroup]="form" (ngSubmit)="create()" novalidate>
          <div class="field"><label for="nc-name">Nombre completo</label><input id="nc-name" class="input" formControlName="fullName" [class.is-invalid]="form.controls.fullName.touched && form.controls.fullName.invalid">
            @if (form.controls.fullName.touched && form.controls.fullName.invalid) { <span class="error">Ingresa el nombre (mín. 3 caracteres).</span> }</div>
          <div class="field"><label for="nc-phone">Teléfono / WhatsApp</label><input id="nc-phone" type="tel" class="input" formControlName="phone" placeholder="+51 999 999 999" [class.is-invalid]="form.controls.phone.touched && form.controls.phone.invalid">
            @if (form.controls.phone.touched && form.controls.phone.invalid) { <span class="error">Ingresa un número válido.</span> }</div>
          <div class="field"><label for="nc-mail">Correo <span class="hint">(opcional)</span></label><input id="nc-mail" type="email" class="input" formControlName="email" [class.is-invalid]="form.controls.email.touched && form.controls.email.invalid">
            @if (form.controls.email.touched && form.controls.email.invalid) { <span class="error">Correo no válido.</span> }
            <span class="hint">Con correo, el cliente podrá activar su cuenta desde “¿Olvidaste tu contraseña?”.</span></div>
          @if (duplicate(); as d) {
            <div class="dup" role="alert"><strong>Ya existe un cliente con este teléfono:</strong> {{ d.fullName }}
              <div class="dup__acts"><button type="button" class="btn btn--primary btn--sm" (click)="openExisting(d.id)">Ver ficha de {{ d.fullName }}</button>
                <label class="switch"><input type="checkbox" formControlName="sameOk"> Es otra persona, crear igual</label></div></div>
          }
          <label class="switch consent"><input type="checkbox" formControlName="consent"><span>El cliente aceptó el tratamiento de sus datos personales para gestionar sus citas e historial.</span></label>
          @if (form.controls.consent.touched && form.controls.consent.invalid) { <span class="error">Debes confirmar el consentimiento.</span> }
          <div class="foot"><button type="button" class="btn btn--outline" (click)="adding.set(false)">Cancelar</button><button type="submit" class="btn btn--primary">Crear cliente</button></div>
        </form>
      </app-modal>
    }

    @if (selected(); as c) {
      <app-modal [heading]="c.fullName" width="720px" (closed)="selectedId.set(null)">
        <p class="muted">{{ c.email || 'Sin correo' }}@if (c.phone) { · {{ c.phone }} } · Cliente desde {{ fmtDate(c.createdAt.slice(0, 10)) }}</p>
        <p class="muted">Consentimiento de datos: @if (c.consentAt) { <strong>sí</strong> · {{ fmtDate(c.consentAt.slice(0, 10)) }} · {{ c.consentSource === 'admin' ? 'registrado en el local' : 'aceptado en la web' }} } @else { <strong>sin registro</strong> }</p>
        <div class="actions-row">
          @if (c.phone) { <a class="btn btn--whatsapp btn--sm" [href]="wa(c.phone)" target="_blank" rel="noopener">WhatsApp</a> }
          <button type="button" class="btn btn--sm" [class.btn--danger]="c.active" [class.btn--primary]="!c.active" (click)="toggleBlock(c)">{{ c.active ? 'Bloquear cuenta' : 'Desbloquear cuenta' }}</button>
        </div>

        <h3>Mascotas ({{ selectedPets().length }})</h3>
        @if (selectedPets().length === 0) { <p class="muted">Sin mascotas registradas.</p> } @else {
          <ul class="adm-list">@for (p of selectedPets(); track p.id) {
            <li><app-icon name="paw" /><div class="grow"><strong>{{ p.name }}</strong><small>{{ speciesLabel(p.species) }} · {{ p.breed }}</small></div>
              <a class="btn btn--outline btn--sm" [routerLink]="['/admin/mascotas', p.id]" (click)="selectedId.set(null)">Abrir ficha</a></li>
          }</ul>
        }

        <h3>Últimas citas</h3>
        @if (selectedAppts().length === 0) { <p class="muted">Sin citas.</p> } @else {
          <ul class="adm-list">@for (a of selectedAppts(); track a.id) {
            <li><span class="time">{{ fmtDate(a.date) }}</span><div class="grow"><strong>{{ a.serviceName }}</strong><small>{{ a.petName }} · {{ fmtTime(a.time) }}</small></div><app-status-badge [status]="a.status" /></li>
          }</ul>
        }
      </app-modal>
    }
  `,
  styles: [`.up { transform: rotate(180deg); } .dup { margin-bottom: 1rem; padding: 0.7rem 0.9rem; font-size: 0.9rem; color: var(--c-warn); background: var(--c-warn-bg); border-radius: var(--radius-sm); } .dup__acts { display: flex; flex-wrap: wrap; gap: 0.6rem 1rem; align-items: center; margin-top: 0.5rem; } .consent { align-items: flex-start; margin-bottom: 0.8rem; font-size: 0.9rem; input { margin-top: 0.2rem; } } .foot { display: flex; justify-content: flex-end; gap: 0.7rem; margin-top: 0.4rem; } h3 { margin: 1.3rem 0 0.4rem; font-size: 1rem; } .actions-row { display: flex; gap: 0.6rem; margin-top: 0.8rem; flex-wrap: wrap; } .time { min-width: 92px; }`],
})
export class CustomersPage {
  protected readonly store = inject(CustomersStore);
  private readonly pets = inject(PetsStore);
  private readonly appts = inject(AppointmentsStore);
  private readonly confirm = inject(ConfirmService);
  private readonly toast = inject(ToastService);

  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly adding = signal(false);
  protected readonly importing = signal(false);
  protected readonly form = this.fb.group({
    fullName: ['', [Validators.required, Validators.minLength(3), noBlank]],
    phone: ['', [Validators.required, phoneValidator]],
    email: ['', [Validators.email]],
    consent: [false, [Validators.requiredTrue]],
    sameOk: [false],
  });
  private readonly phoneValue = toSignal(this.form.controls.phone.valueChanges.pipe(startWith('')), { initialValue: '' });
  protected readonly duplicate = computed(() => (this.adding() ? this.store.findByPhone(this.phoneValue()) : undefined));
  protected readonly q = signal('');
  protected readonly selectedId = signal<string | null>(null);
  protected readonly fmtDate = formatDate;
  protected readonly fmtTime = formatTime;
  protected readonly speciesLabel = speciesLabel;

  protected readonly filtered = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.store.clients().filter((c) => !q || [c.fullName, c.email, c.phone ?? ''].some((t) => t.toLowerCase().includes(q)));
  });
  protected readonly selected = computed(() => this.store.clients().find((c) => c.id === this.selectedId()) ?? null);
  protected readonly selectedPets = computed(() => (this.selectedId() ? this.pets.ofOwner(this.selectedId()!) : []));
  protected readonly selectedAppts = computed(() => this.appts.all().filter((a) => a.userId === this.selectedId()).slice(0, 8));

  protected openNew(): void { this.form.reset({ fullName: '', phone: '', email: '', consent: false, sameOk: false }); this.adding.set(true); }

  protected create(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    if (this.duplicate() && !v.sameOk) { this.toast.error('Ese teléfono ya está registrado. Abre la ficha existente o confirma que es otra persona.'); return; }
    this.store.create({ fullName: v.fullName, phone: v.phone, email: v.email, consent: v.consent }).subscribe({
      next: (c) => {
        this.toast.success(`Cliente ${c.fullName} creado.`);
        this.adding.set(false);
        this.selectedId.set(c.id);
      },
      error: (e: Error) => this.toast.error(e.message),
    });
  }

  protected openExisting(id: string): void { this.adding.set(false); this.selectedId.set(id); }

  protected petCount(id: string): number { return this.pets.ofOwner(id).length; }
  protected apptCount(id: string): number { return this.appts.all().filter((a) => a.userId === id).length; }
  protected wa(phone: string): string { return `https://wa.me/${phone.replace(/\D/g, '')}`; }

  protected async toggleBlock(c: User): Promise<void> {
    const ok = await this.confirm.ask({
      title: c.active ? 'Bloquear cuenta' : 'Desbloquear cuenta',
      message: c.active ? `${c.fullName} no podrá iniciar sesión ni reservar mientras esté bloqueado.` : `${c.fullName} podrá volver a iniciar sesión.`,
      confirmText: c.active ? 'Bloquear' : 'Desbloquear', danger: c.active,
    });
    if (!ok) return;
    this.store.setActive(c.id, !c.active);
    this.toast.success(c.active ? 'Cuenta bloqueada.' : 'Cuenta desbloqueada.');
  }

  protected exportCsv(): void {
    downloadCsv('clientes.csv', [['Nombre', 'Correo', 'Teléfono', 'Mascotas', 'Citas', 'Registro', 'Estado'],
      ...this.filtered().map((c) => [c.fullName, c.email, c.phone, this.petCount(c.id), this.apptCount(c.id), c.createdAt.slice(0, 10), c.active ? 'Activo' : 'Bloqueado'])]);
  }
}
