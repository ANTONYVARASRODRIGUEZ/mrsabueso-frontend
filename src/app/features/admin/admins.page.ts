import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiDb, upsert } from '../../core/data/api-db.service';
import { User } from '../../core/models';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { formatDate } from '../../core/utils/date';
import { noBlank, passwordStrength } from '../../core/validators/validators';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';

/** Cuentas con acceso al panel. Solo un administrador puede crear otro; el registro web siempre crea clientes. */
@Component({
  selector: 'app-admins-page',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div><h1>Administradores</h1><p>{{ admins().length }} cuentas con acceso al panel</p></div>
      <div class="actions"><button type="button" class="btn btn--primary" (click)="openNew()"><app-icon name="plus" /> Nuevo administrador</button></div>
    </header>
    <section class="adm-card">
      @if (admins().length === 0) { <p class="adm-empty">Cargando…</p> } @else {
        <div class="adm-table-wrap"><table class="adm-table">
          <thead><tr><th>Nombre</th><th>Correo</th><th>Alta</th><th>Estado</th><th></th></tr></thead>
          <tbody>@for (a of admins(); track a.id) {
            <tr><td><strong>{{ a.fullName }}</strong>@if (a.id === me()) { <small>Tú</small> }</td>
              <td>{{ a.email }}</td>
              <td class="nowrap">{{ fmtDate(a.createdAt.slice(0, 10)) }}</td>
              <td><span [class]="'badge ' + (a.active ? 'badge--success' : 'badge--danger')">{{ a.active ? 'Activo' : 'Bloqueado' }}</span></td>
              <td><span class="row-actions">@if (a.id !== me()) {
                <button type="button" class="btn btn--outline btn--sm" (click)="toggle(a)">{{ a.active ? 'Bloquear' : 'Desbloquear' }}</button>
              }</span></td></tr>
          }</tbody></table></div>
      }
    </section>
    @if (adding()) {
      <app-modal heading="Nuevo administrador" width="480px" (closed)="adding.set(false)">
        <form [formGroup]="form" (ngSubmit)="create()" novalidate>
          <div class="field"><label for="na-name">Nombre completo</label><input id="na-name" class="input" formControlName="fullName" [class.is-invalid]="invalid('fullName')">
            @if (invalid('fullName')) { <span class="error">Ingresa el nombre (mín. 3 caracteres).</span> }</div>
          <div class="field"><label for="na-mail">Correo</label><input id="na-mail" type="email" class="input" formControlName="email" autocomplete="off" [class.is-invalid]="invalid('email')">
            @if (invalid('email')) { <span class="error">Correo no válido.</span> }</div>
          <div class="field"><label for="na-pass">Contraseña inicial</label><input id="na-pass" type="password" class="input" formControlName="password" autocomplete="new-password" [class.is-invalid]="invalid('password')">
            @if (invalid('password')) { <span class="error">Mínimo 8 caracteres, con letras y números.</span> }
            <span class="hint">Compártela con la persona; podrá cambiarla con “¿Olvidaste tu contraseña?”.</span></div>
          <p class="hint">Tendrá acceso completo al panel: citas, clientes, configuración y administradores.</p>
          <div class="actions" style="display:flex;gap:0.6rem;justify-content:flex-end;margin-top:1rem">
            <button type="button" class="btn btn--outline" (click)="adding.set(false)">Cancelar</button>
            <button type="submit" class="btn btn--primary" [disabled]="saving()">{{ saving() ? 'Creando…' : 'Crear administrador' }}</button>
          </div>
        </form>
      </app-modal>
    }
  `,
})
export class AdminsPage {
  private readonly db = inject(ApiDb);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly auth = inject(AuthService);
  protected readonly me = computed(() => this.auth.user()?.id);

  protected readonly admins = signal<User[]>([]);
  protected readonly adding = signal(false);
  protected readonly saving = signal(false);
  protected readonly fmtDate = formatDate;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(3), noBlank]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, passwordStrength]],
  });

  constructor() {
    this.db.req<User[]>('GET', '/admins').subscribe({ next: (l) => this.admins.set(l), error: (e: Error) => this.toast.error(e.message) });
  }

  protected invalid(name: 'fullName' | 'email' | 'password'): boolean {
    const c = this.form.controls[name];
    return c.touched && c.invalid;
  }

  protected openNew(): void { this.form.reset(); this.adding.set(true); }

  protected create(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.saving.set(true);
    this.db.req<User>('POST', '/admins', this.form.getRawValue()).subscribe({
      next: (u) => { this.saving.set(false); this.adding.set(false); this.admins.update((l) => [...l, u]); this.toast.success(`Administrador ${u.fullName} creado.`); },
      error: (e: Error) => { this.saving.set(false); this.toast.error(e.message); },
    });
  }

  protected async toggle(a: User): Promise<void> {
    const ok = await this.confirm.ask({
      title: a.active ? 'Bloquear administrador' : 'Desbloquear administrador',
      message: a.active ? `${a.fullName} ya no podrá entrar al panel.` : `${a.fullName} podrá volver a entrar al panel.`,
      confirmText: a.active ? 'Bloquear' : 'Desbloquear', danger: a.active,
    });
    if (!ok) return;
    this.db.req<User>('PATCH', `/admins/${a.id}/active`, { active: !a.active }).subscribe({
      next: (u) => { this.admins.update((l) => upsert(l, u)); this.toast.success(u.active ? 'Cuenta desbloqueada.' : 'Cuenta bloqueada.'); },
      error: (e: Error) => this.toast.error(e.message),
    });
  }
}
