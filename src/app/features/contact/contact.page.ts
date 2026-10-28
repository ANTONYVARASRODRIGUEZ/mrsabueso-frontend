import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { MessagesStore } from '../../core/state/messages.store';
import { ServicesStore } from '../../core/state/services.store';
import { SettingsStore } from '../../core/state/settings.store';
import { noBlank, phoneValidator } from '../../core/validators/validators';
import { IconComponent } from '../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-contact-page',
  standalone: true,
  imports: [ReactiveFormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact.page.html',
  styleUrl: './contact.page.scss',
})
export class ContactPage {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly messages = inject(MessagesStore);
  private readonly toast = inject(ToastService);
  private readonly auth = inject(AuthService);
  private readonly settingsStore = inject(SettingsStore);

  protected readonly s = this.settingsStore.settings;
  protected readonly schedule = this.settingsStore.schedule;
  protected readonly maps = this.settingsStore.mapsLink;
  protected readonly services = inject(ServicesStore).active;
  protected readonly sending = signal(false);

  protected readonly form = this.fb.group({
    fullName: [this.auth.user()?.fullName ?? '', [Validators.required, noBlank]],
    phone: [this.auth.user()?.phone ?? '', [Validators.required, phoneValidator]],
    serviceId: [this.services()[0]?.id ?? ''],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500), noBlank]],
  });

  protected wa(): string { return this.settingsStore.whatsappLink('Hola, quisiera más información.'); }

  protected invalid(name: 'fullName' | 'phone' | 'message'): boolean {
    const c = this.form.controls[name];
    return c.touched && c.invalid;
  }

  protected submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.sending.set(true);
    this.messages.send(this.form.getRawValue()).subscribe({
      next: () => {
        this.sending.set(false);
        this.toast.success('¡Gracias! Recibimos tu consulta y te responderemos pronto.');
        this.form.controls.message.reset('');
        this.form.controls.message.markAsUntouched();
      },
      error: () => { this.sending.set(false); this.toast.error('No pudimos enviar tu consulta. Inténtalo de nuevo.'); },
    });
  }
}
