import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { DEMO_ADMIN, DEMO_USER } from '../../core/config/demo';
import { User } from '../../core/models';
import { AuthError, AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { GoogleButtonComponent } from '../../shared/ui/google-button/google-button.component';
import { PhotoComponent } from '../../shared/ui/photo/photo.component';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PhotoComponent, GoogleButtonComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login.page.html',
  styleUrl: './auth.shared.scss',
})
export class LoginPage {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Ruta a la que volver tras iniciar sesión (query param ?returnUrl=). */
  readonly returnUrl = input<string>();

  protected readonly demo = DEMO_USER;
  protected readonly admin = DEMO_ADMIN;
  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly showPassword = signal(false);

  protected welcome(user: User): void {
    this.toast.success(`¡Hola, ${user.fullName.split(' ')[0]}!`);
    const target = this.returnUrl();
    void this.router.navigateByUrl(target && target.startsWith('/') ? target : user.role === 'admin' ? '/admin' : '/');
  }

  protected googleError(e: AuthError): void { this.error.set(e.code === 'disabled' ? 'Tu cuenta está bloqueada. Contáctanos para más información.' : 'No pudimos ingresar con Google. Inténtalo de nuevo.'); }

  protected useDemo(asAdmin: boolean): void {
    const a = asAdmin ? DEMO_ADMIN : DEMO_USER;
    this.form.setValue({ email: a.email, password: a.password });
  }

  protected submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.error.set('');
    this.loading.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (user) => this.welcome(user),
      error: (e: unknown) => {
        this.loading.set(false);
        this.error.set(e instanceof AuthError && e.code === 'invalid-credentials'
          ? 'Correo o contraseña incorrectos.' : e instanceof AuthError && e.code === 'disabled'
          ? 'Tu cuenta está bloqueada. Contáctanos para más información.' : 'No pudimos iniciar sesión. Inténtalo de nuevo.');
      },
    });
  }
}
