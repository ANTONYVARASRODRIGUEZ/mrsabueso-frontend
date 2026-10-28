import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IconName, Service } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { ServicesStore } from '../../core/state/services.store';
import { noBlank } from '../../core/validators/validators';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { ModalComponent } from '../../shared/ui/modal/modal.component';

const ICONS: IconName[] = ['scissors', 'stethoscope', 'syringe', 'tooth', 'bag', 'paw', 'heart', 'shield', 'star'];
const slug = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

@Component({
  selector: 'app-admin-services-page',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent, ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head">
      <div><h1>Servicios</h1><p>Lo que ofreces en el sitio y en la reserva en línea</p></div>
      <div class="actions"><button type="button" class="btn btn--primary" (click)="open('new')"><app-icon name="plus" /> Nuevo servicio</button></div>
    </header>
    <section class="adm-card">
      <div class="adm-table-wrap"><table class="adm-table">
        <thead><tr><th>Servicio</th><th class="num">Precio desde</th><th class="num">Duración</th><th>Reserva en línea</th><th>Visible</th><th></th></tr></thead>
        <tbody>@for (s of store.all(); track s.id) {
          <tr><td><div class="who"><span class="ph"><app-icon [name]="s.icon" /></span><div><strong>{{ s.name }}</strong><small>{{ s.summary }}</small></div></div></td>
            <td class="num nowrap">{{ s.priceFrom ? 'S/ ' + s.priceFrom : '—' }}</td><td class="num nowrap">{{ s.durationMin ? s.durationMin + ' min' : '—' }}</td>
            <td><span class="badge" [class]="'badge ' + (s.bookable ? 'badge--success' : 'badge--info')">{{ s.bookable ? 'Sí' : 'No' }}</span></td>
            <td><label class="switch"><input type="checkbox" [checked]="s.active" (change)="toggle(s)" [attr.aria-label]="'Visible: ' + s.name"> {{ s.active ? 'Visible' : 'Oculto' }}</label></td>
            <td><span class="row-actions"><button type="button" class="icon-btn" (click)="open(s)" aria-label="Editar"><app-icon name="edit" /></button><button type="button" class="icon-btn danger" (click)="remove(s)" aria-label="Eliminar"><app-icon name="trash" /></button></span></td></tr>
        }</tbody></table></div>
    </section>

    @if (editing()) {
      <app-modal [heading]="editing() === 'new' ? 'Nuevo servicio' : 'Editar servicio'" width="640px" (closed)="editing.set(null)">
        <form [formGroup]="form" (ngSubmit)="save()" novalidate>
          <div class="form-grid">
            <div class="field full"><label for="s-name">Nombre</label><input id="s-name" class="input" formControlName="name" [class.is-invalid]="form.controls.name.touched && form.controls.name.invalid"></div>
            <div class="field full"><label for="s-sum">Resumen corto</label><input id="s-sum" class="input" formControlName="summary" maxlength="80"></div>
            <div class="field full"><label for="s-desc">Descripción</label><textarea id="s-desc" class="input" formControlName="description"></textarea></div>
            <div class="field full"><label for="s-inc">Qué incluye <span class="hint">(una línea por ítem)</span></label><textarea id="s-inc" class="input" formControlName="includes"></textarea></div>
            <div class="field"><label for="s-price">Precio desde (S/)</label><input id="s-price" type="number" min="0" class="input" formControlName="priceFrom"></div>
            <div class="field"><label for="s-dur">Duración (min)</label><input id="s-dur" type="number" min="0" step="5" class="input" formControlName="durationMin"></div>
            <div class="field"><label for="s-icon">Ícono</label><select id="s-icon" class="input" formControlName="icon">@for (i of icons; track i) { <option [value]="i">{{ i }}</option> }</select></div>
            <div class="field"><label for="s-img">Foto (ruta)</label><input id="s-img" class="input" formControlName="image" placeholder="images/services/…jpg"></div>
            <label class="switch full"><input type="checkbox" formControlName="bookable"> Se puede reservar en línea</label>
            <label class="switch full"><input type="checkbox" formControlName="active"> Visible en el sitio</label>
          </div>
          <div class="foot"><button type="button" class="btn btn--outline" (click)="editing.set(null)">Cancelar</button><button type="submit" class="btn btn--primary">Guardar</button></div>
        </form>
      </app-modal>
    }
  `,
  styles: [`.foot { display: flex; justify-content: flex-end; gap: 0.7rem; margin-top: 1rem; } .switch.full { margin-bottom: 0.6rem; grid-column: 1 / -1; }`],
})
export class AdminServicesPage {
  protected readonly store = inject(ServicesStore);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly icons = ICONS;
  protected readonly editing = signal<Service | 'new' | null>(null);
  protected readonly form = this.fb.group({
    name: ['', [Validators.required, noBlank]], summary: [''], description: [''], includes: [''],
    priceFrom: [null as number | null], durationMin: [30], icon: ['paw' as IconName], image: [''], bookable: [true], active: [true],
  });

  protected open(s: Service | 'new'): void {
    this.form.reset(s === 'new'
      ? { name: '', summary: '', description: '', includes: '', priceFrom: null, durationMin: 30, icon: 'paw', image: '', bookable: true, active: true }
      : { name: s.name, summary: s.summary, description: s.description, includes: s.includes.join('\n'), priceFrom: s.priceFrom ?? null, durationMin: s.durationMin, icon: s.icon, image: s.image, bookable: s.bookable, active: s.active });
    this.editing.set(s);
  }

  protected save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue(); const cur = this.editing();
    const existing = cur && cur !== 'new' ? cur : null;
    let id = existing?.id ?? (slug(v.name) || `servicio-${Date.now()}`);
    if (!existing) { const base = id; let n = 2; while (this.store.byId(id)) id = `${base}-${n++}`; }
    this.store.save({
      id, name: v.name.trim(), summary: v.summary.trim(), description: v.description.trim(), includes: v.includes.split('\n').map((x) => x.trim()).filter(Boolean),
      icon: v.icon, priceFrom: v.priceFrom ?? undefined, durationMin: v.durationMin ?? 0, bookable: v.bookable && v.priceFrom !== null, active: v.active, image: v.image.trim() || `images/services/${id}.jpg`,
    });
    this.toast.success('Servicio guardado.'); this.editing.set(null);
  }

  protected toggle(s: Service): void { this.store.toggleActive(s.id); }

  protected async remove(s: Service): Promise<void> {
    if (await this.confirm.ask({ title: 'Eliminar servicio', message: `¿Eliminar “${s.name}”? Las citas anteriores conservarán su nombre. Si solo quieres ocultarlo, desactiva “Visible”.`, confirmText: 'Eliminar', danger: true })) {
      this.store.remove(s.id); this.toast.success('Servicio eliminado.');
    }
  }
}
