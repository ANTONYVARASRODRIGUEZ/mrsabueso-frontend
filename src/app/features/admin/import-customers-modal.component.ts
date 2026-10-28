import { ChangeDetectionStrategy, Component, computed, inject, output, signal } from '@angular/core';
import { catchError, concatMap, from, of, tap, toArray } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';
import { CustomersStore } from '../../core/state/customers.store';
import { PetsStore } from '../../core/state/pets.store';
import { downloadFile } from '../../core/utils/csv';
import { IMPORT_TEMPLATE, ImportRow, buildImportRows, parseCsv } from '../../core/utils/csv-import';
import { ModalComponent } from '../../shared/ui/modal/modal.component';

const STATUS_LABEL = { ok: 'Listo', duplicate: 'Duplicado', error: 'Error' } as const;
const STATUS_TONE = { ok: 'success', duplicate: 'warn', error: 'danger' } as const;

/** Importación masiva de clientes (y sus mascotas) desde un CSV exportado de Excel. */
@Component({
  selector: 'app-import-customers-modal',
  standalone: true,
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-modal heading="Importar clientes desde CSV" width="760px" (closed)="closed.emit()">
      <p class="intro">Sube un archivo <strong>.csv</strong> con las columnas <code>nombre, telefono, correo, mascota, especie, raza</code>
        (solo nombre y teléfono son obligatorios). En Excel: <em>Archivo → Guardar como → CSV</em>.</p>
      <div class="bar">
        <label class="btn btn--primary btn--sm" for="imp-file">Elegir archivo CSV</label>
        <input id="imp-file" type="file" accept=".csv,.txt,text/csv" class="sr-only" (change)="onFile($event)">
        <button type="button" class="btn btn--outline btn--sm" (click)="template()">Descargar plantilla</button>
        @if (fileName()) { <span class="muted">{{ fileName() }}</span> }
      </div>
      @if (problem()) { <p class="alert" role="alert">{{ problem() }}</p> }

      @if (rows().length > 0) {
        <div class="chips"><span class="badge badge--success">{{ count('ok') }} listos</span><span class="badge badge--warn">{{ count('duplicate') }} duplicados (se omiten)</span><span class="badge badge--danger">{{ count('error') }} con error (se omiten)</span></div>
        <div class="adm-table-wrap tall"><table class="adm-table">
          <thead><tr><th>Línea</th><th>Cliente</th><th>Teléfono</th><th>Mascota</th><th>Estado</th></tr></thead>
          <tbody>@for (r of preview(); track r.line) {
            <tr><td>{{ r.line }}</td><td>{{ r.fullName }}<small>{{ r.email }}</small></td><td>{{ r.phone }}</td><td>{{ r.petName || '—' }}</td>
              <td><span class="badge" [class]="'badge badge--' + tone[r.status]">{{ label[r.status] }}</span>@if (r.message) { <small>{{ r.message }}</small> }</td></tr>
          }</tbody></table></div>
        @if (rows().length > preview().length) { <p class="muted">Mostrando las primeras {{ preview().length }} de {{ rows().length }} filas.</p> }

        <label class="switch consent"><input type="checkbox" [checked]="consent()" (change)="consent.set(!consent())">
          <span>Confirmo que cuento con el consentimiento de estas personas para tratar sus datos personales.</span></label>
        <div class="foot"><button type="button" class="btn btn--outline" (click)="closed.emit()">Cancelar</button>
          <button type="button" class="btn btn--primary" [disabled]="!consent() || count('ok') === 0 || importing()" (click)="run()">{{ importing() ? 'Importando…' : 'Importar ' + count('ok') + ' clientes' }}</button></div>
      }
    </app-modal>
  `,
  styles: [`
    .intro { margin-bottom: 1rem; color: var(--c-ink-2); font-size: 0.93rem; code { padding: 0.05rem 0.3rem; background: var(--c-bg); border-radius: 4px; } }
    .bar { display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem; margin-bottom: 1rem; } .muted { color: var(--c-muted); font-size: 0.88rem; }
    .alert { margin-bottom: 1rem; padding: 0.7rem 0.9rem; font-size: 0.92rem; color: var(--c-danger); background: var(--c-danger-bg); border-radius: var(--radius-sm); }
    .chips { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.8rem; } .tall { max-height: 280px; overflow-y: auto; }
    .consent { align-items: flex-start; margin: 1rem 0; font-size: 0.9rem; input { margin-top: 0.2rem; } } .foot { display: flex; justify-content: flex-end; gap: 0.7rem; }
  `],
})
export class ImportCustomersModalComponent {
  private readonly customers = inject(CustomersStore);
  private readonly pets = inject(PetsStore);
  private readonly toast = inject(ToastService);

  readonly closed = output<void>();
  protected readonly rows = signal<ImportRow[]>([]);
  protected readonly fileName = signal('');
  protected readonly problem = signal('');
  protected readonly consent = signal(false);
  protected readonly importing = signal(false);
  protected readonly label = STATUS_LABEL;
  protected readonly tone = STATUS_TONE;
  protected readonly preview = computed(() => this.rows().slice(0, 50));

  protected count(status: ImportRow['status']): number { return this.rows().filter((r) => r.status === status).length; }
  protected template(): void { downloadFile('plantilla-clientes.csv', '\ufeff' + IMPORT_TEMPLATE, 'text/csv;charset=utf-8'); }

  protected async onFile(event: Event): Promise<void> {
    const file = (event.target as HTMLInputElement).files?.[0];
    this.rows.set([]); this.problem.set(''); this.consent.set(false);
    if (!file) return;
    this.fileName.set(file.name);
    if (file.size > 2 * 1024 * 1024) { this.problem.set('El archivo es muy grande (máximo 2 MB).'); return; }
    const table = parseCsv(await file.text());
    const phones = new Set(this.customers.clients().map((c) => (c.phone ?? '').replace(/\D/g, '')).filter(Boolean));
    const emails = new Set(this.customers.clients().map((c) => c.email).filter(Boolean));
    const { rows, missingColumns } = buildImportRows(table, phones, emails);
    if (missingColumns.length) { this.problem.set(`Faltan columnas obligatorias: ${missingColumns.join(', ')}. Descarga la plantilla para ver el formato.`); return; }
    if (rows.length === 0) { this.problem.set('El archivo no tiene filas de datos.'); return; }
    this.rows.set(rows);
  }

  protected run(): void {
    const ok = this.rows().filter((r) => r.status === 'ok');
    this.importing.set(true);
    let created = 0; let failed = 0;
    // Uno por uno para no saturar el servidor; cada fila crea el cliente y, si trae, su mascota.
    from(ok).pipe(
      concatMap((r) => this.customers.create({ fullName: r.fullName, phone: r.phone, email: r.email, consent: this.consent() }).pipe(
        tap(() => created++),
        concatMap((c) => (r.petName ? this.pets.add({ name: r.petName, species: r.species, breed: r.breed || 'Mestizo' }, c.id) : of(null))),
        catchError(() => { failed++; return of(null); }),
      )),
      toArray(),
    ).subscribe({
      next: () => { this.importing.set(false); this.toast.success(`${created} clientes importados${failed ? ` (${failed} con error)` : ''}.`); this.closed.emit(); },
      error: () => { this.importing.set(false); this.toast.error('Se importaron los clientes, pero hubo un problema con algunas mascotas.'); this.closed.emit(); },
    });
  }
}
