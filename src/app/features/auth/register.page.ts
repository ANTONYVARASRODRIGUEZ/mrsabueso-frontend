import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { User } from '../../core/models';
import { AuthError, AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { matchFields, noBlank, passwordStrength, phoneValidator } from '../../core/validators/validators';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { GoogleButtonComponent } from '../../shared/ui/google-button/google-button.component';
import { PhotoComponent } from '../../shared/ui/photo/photo.component';

@Component({
  selector: 'app-register-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PhotoComponent, IconComponent, GoogleButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './register.page.html',
  styleUrl: './auth.shared.scss',
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  readonly returnUrl = input<string>();

  protected readonly form = this.fb.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80), noBlank]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [phoneValidator]],
      password: ['', [Validators.required, passwordStrength]],
      confirm: ['', [Validators.required]],
      terms: [false, [Validators.requiredTrue]],
    },
    { validators: matchFields('password', 'confirm') },
  );
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly showPassword = signal(false);

  protected readonly perks = ['Reserva en menos de un minuto', 'Historial de citas y mascotas', 'Recordatorios por WhatsApp'];

  protected invalid(name: 'fullName' | 'email' | 'phone' | 'password' | 'confirm'): boolean {
    const c = this.form.controls[name];
    return c.touched && c.invalid;
  }

  protected welcome(user: User): void {
    this.toast.success(`¡Bienvenido, ${user.fullName.split(' ')[0]}!`);
    const target = this.returnUrl();
    void this.router.navigateByUrl(target && target.startsWith('/') ? target : user.role === 'admin' ? '/admin' : '/reservar');
  }

  protected googleError(e: AuthError): void { this.error.set(e.code === 'disabled' ? 'Tu cuenta está bloqueada. Contáctanos para más información.' : 'No pudimos ingresar con Google. Inténtalo de nuevo.'); }

  protected submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error.set('');
    this.loading.set(true);
    const { fullName, email, phone, password } = this.form.getRawValue();
    this.auth.register({ fullName, email, phone, password }).subscribe({
      next: (user) => {
        this.toast.success(`¡Cuenta creada! Bienvenido, ${user.fullName.split(' ')[0]}.`);
        const target = this.returnUrl();
        void this.router.navigateByUrl(target && target.startsWith('/') ? target : '/reservar');
      },
      error: (e: unknown) => {
        this.loading.set(false);
        this.error.set(e instanceof AuthError && e.code === 'email-taken'
          ? 'Ya existe una cuenta con ese correo. Prueba iniciando sesión.' : 'No pudimos crear tu cuenta. Inténtalo de nuevo.');
      },
    });
  }
}
