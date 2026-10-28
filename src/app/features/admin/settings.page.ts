import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { DAY_NAMES, DISPLAY_DAY_ORDER } from '../../core/config/business';
import { ApiDb } from '../../core/data/api-db.service';
import { BusinessSettings } from '../../core/models';
import { ToastService } from '../../core/services/toast.service';
import { SettingsStore } from '../../core/state/settings.store';
import { downloadFile } from '../../core/utils/csv';
import { formatDate, formatTime, todayIso } from '../../core/utils/date';
import { noBlank } from '../../core/validators/validators';
import { IconComponent } from '../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './settings.page.html',
})
export class SettingsPage {
  private readonly store = inject(SettingsStore);
  private readonly db = inject(ApiDb);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly toast = inject(ToastService);

  protected readonly dayNames = DAY_NAMES;
  protected readonly order = DISPLAY_DAY_ORDER;
  protected readonly fmtTime = formatTime;
  protected readonly fmtDate = formatDate;
  protected readonly today = todayIso();
  protected readonly newSlot = signal('');
  protected readonly newClosed = signal('');

  private readonly initial = this.store.settings();
  protected readonly slots = signal<string[]>([...this.initial.slots].sort());
  protected readonly closedDates = signal<string[]>([...this.initial.closedDates].sort());

  protected readonly form = this.fb.group({
    name: [this.initial.name, [Validators.required, noBlank]],
    tagline: [this.initial.tagline],
    phone: [this.initial.phone, Validators.required],
    whatsapp: [this.initial.whatsapp, [Validators.required, Validators.pattern(/^\d{8,15}$/)]],
    email: [this.initial.email, Validators.email],
    address: [this.initial.address],
    mapsUrl: [this.initial.mapsUrl, Validators.pattern(/^$|^https?:\/\/.+/)],
    facebook: [this.initial.facebook],
    apptReminderTemplate: [this.initial.apptReminderTemplate, Validators.required],
    vaccineReminderTemplate: [this.initial.vaccineReminderTemplate, Validators.required],
    hours: this.fb.array(this.initial.hours.map((h) => this.fb.group({ day: [h.day], open: [h.open], from: [h.from, Validators.required], to: [h.to, Validators.required] }))),
  });

  protected readonly hoursArray = computed(() => this.form.controls.hours);
  protected hourGroup(day: number): FormGroup { return (this.form.controls.hours as FormArray).controls.find((g) => g.value.day === day) as FormGroup; }

  protected addSlot(): void {
    const v = this.newSlot();
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(v)) return;
    if (this.slots().includes(v)) { this.toast.error('Ese horario ya existe.'); return; }
    this.slots.update((l) => [...l, v].sort()); this.newSlot.set('');
  }
  protected removeSlot(s: string): void { this.slots.update((l) => l.filter((x) => x !== s)); }
  protected addClosed(): void {
    const v = this.newClosed();
    if (!v || this.closedDates().includes(v)) return;
    this.closedDates.update((l) => [...l, v].sort()); this.newClosed.set('');
  }
  protected removeClosed(d: string): void { this.closedDates.update((l) => l.filter((x) => x !== d)); }

  protected save(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); this.toast.error('Revisa los campos marcados.'); return; }
    const v = this.form.getRawValue();
    const bad = v.hours.find((h) => h.open && h.from >= h.to);
    if (bad) { this.toast.error(`En ${DAY_NAMES[bad.day]}, la hora de cierre debe ser posterior a la de apertura.`); return; }
    if (this.slots().length === 0) { this.toast.error('Agrega al menos un horario de cita.'); return; }
    const next: BusinessSettings = { name: v.name.trim(), tagline: v.tagline.trim(), phone: v.phone.trim(), whatsapp: v.whatsapp, email: v.email.trim(), address: v.address.trim(), mapsUrl: v.mapsUrl.trim(), facebook: v.facebook.trim(), apptReminderTemplate: v.apptReminderTemplate.trim(), vaccineReminderTemplate: v.vaccineReminderTemplate.trim(), hours: v.hours, slots: this.slots(), closedDates: this.closedDates() };
    this.store.update(next);
    this.form.markAsPristine();
    this.toast.success('Configuración guardada. Ya se refleja en el sitio.');
  }

  protected backup(): void {
    this.db.exportJson().subscribe({
      next: (json) => downloadFile(`respaldo-mr-sabueso-${todayIso()}.json`, json, 'application/json'),
      error: (e: Error) => this.toast.error(e.message),
    });
  }
}
