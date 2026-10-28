import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { matchFields, passwordStrength } from '../../core/validators/validators';
import { PhotoComponent } from '../../shared/ui/photo/photo.component';

@Component({
  selector: 'app-reset-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './reset-password.page.html',
  styleUrl: './auth.shared.scss',
})
export class ResetPasswordPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);

  /** Token de la URL: /restablecer?token=... */
  readonly token = input<string>();
  /** null mientras se consulta al servidor. */
  protected readonly tokenValid = toSignal(toObservable(this.token).pipe(switchMap((t) => this.auth.checkResetToken(t))), { initialValue: null });

  protected readonly form = inject(FormBuilder).nonNullable.group(
    { password: ['', [Validators.required, passwordStrength]], confirm: ['', [Validators.required]] },
    { validators: matchFields('password', 'confirm') },
  );
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly show = signal(false);

  protected submit(): void {
    const token = this.token();
    if (this.form.invalid || !token) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.auth.resetPassword(token, this.form.getRawValue().password).subscribe({
      next: () => { this.toast.success('Contraseña actualizada. Ya puedes iniciar sesión.'); void this.router.navigateByUrl('/iniciar-sesion'); },
      error: () => { this.loading.set(false); this.error.set('El enlace no es válido o ya venció. Solicita uno nuevo.'); },
    });
  }
}
