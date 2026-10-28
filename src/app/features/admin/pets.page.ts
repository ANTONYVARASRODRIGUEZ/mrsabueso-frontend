import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Pet, PetSpecies } from '../../core/models';
import { CustomersStore } from '../../core/state/customers.store';
import { AppointmentsStore } from '../../core/state/appointments.store';
import { MedicalStore, VaccineStatus, vaccineStatus } from '../../core/state/medical.store';
import { PetsStore, speciesLabel } from '../../core/state/pets.store';
import { formatDate } from '../../core/utils/date';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { VACCINE_STATUS_LABEL, VACCINE_STATUS_TONE } from '../account/pet-record-modal.component';

const ORDER: VaccineStatus[] = ['overdue', 'soon', 'ok', 'none'];

@Component({
  selector: 'app-admin-pets-page',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head"><div><h1>Mascotas</h1><p>{{ filtered().length }} de {{ pets.all().length }} mascotas · Fichas clínicas y carnet de vacunación</p></div></header>
    <section class="adm-card">
      <div class="adm-filters">
        <label class="f search">Buscar<app-icon name="search" /><input class="input" placeholder="Nombre, raza o dueño" [ngModel]="q()" (ngModelChange)="q.set($event)"></label>
        <label class="f">Especie<select class="input" [ngModel]="species()" (ngModelChange)="species.set($event)"><option value="all">Todas</option><option value="dog">Perros</option><option value="cat">Gatos</option><option value="other">Otras</option></select></label>
        <label class="f">Vacunas<select class="input" [ngModel]="vac()" (ngModelChange)="vac.set($event)"><option value="all">Todas</option><option value="overdue">Vencidas</option><option value="soon">Por vencer</option><option value="ok">Al día</option></select></label>
      </div>
      @if (filtered().length === 0) { <p class="adm-empty">No se encontraron mascotas.</p> } @else {
        <div class="adm-table-wrap"><table class="adm-table">
          <thead><tr><th>Mascota</th><th>Especie</th><th>Dueño</th><th>Última visita</th><th>Vacunas</th><th></th></tr></thead>
          <tbody>@for (r of filtered(); track r.pet.id) {
            <tr><td><div class="who">@if (r.pet.photoUrl) { <img [src]="r.pet.photoUrl" [alt]="r.pet.name" width="38" height="38"> } @else { <span class="ph"><app-icon name="paw" /></span> }<div><strong>{{ r.pet.name }}</strong><small>{{ r.pet.breed }}</small></div></div></td>
              <td>{{ speciesLabel(r.pet.species) }}</td><td>{{ r.owner }}</td><td class="nowrap">{{ r.last ? fmtDate(r.last) : '—' }}</td>
              <td><span class="badge" [class]="'badge badge--' + tone[r.vac]">{{ label[r.vac] }}</span></td>
              <td><span class="row-actions"><a class="btn btn--outline btn--sm" [routerLink]="['/admin/mascotas', r.pet.id]">Abrir ficha</a></span></td></tr>
          }</tbody></table></div>
      }
    </section>
  `,
})
export class AdminPetsPage {
  protected readonly pets = inject(PetsStore);
  private readonly customers = inject(CustomersStore);
  private readonly appts = inject(AppointmentsStore);
  private readonly medical = inject(MedicalStore);

  protected readonly q = signal('');
  protected readonly species = signal<PetSpecies | 'all'>('all');
  protected readonly vac = signal<VaccineStatus | 'all'>('all');
  protected readonly fmtDate = formatDate;
  protected readonly speciesLabel = speciesLabel;
  protected readonly tone = VACCINE_STATUS_TONE;
  protected readonly label: Record<VaccineStatus, string> = { ...VACCINE_STATUS_LABEL, none: 'Sin registro' };

  private readonly rows = computed(() => this.pets.all().map((pet: Pet) => {
    const owner = this.customers.byId(pet.ownerId)?.fullName ?? '—';
    const last = this.appts.all().find((a) => a.petId === pet.id && a.status === 'attended')?.date;
    const statuses = this.medical.latestVaccines().filter((v) => v.petId === pet.id).map((v) => vaccineStatus(v));
    const vac: VaccineStatus = ORDER.find((s) => statuses.includes(s)) ?? 'none';
    return { pet, owner, last, vac };
  }));

  protected readonly filtered = computed(() => {
    const q = this.q().trim().toLowerCase();
    return this.rows().filter((r) =>
      (!q || [r.pet.name, r.pet.breed, r.owner].some((t) => t.toLowerCase().includes(q)))
      && (this.species() === 'all' || r.pet.species === this.species())
      && (this.vac() === 'all' || r.vac === this.vac()));
  });
}
