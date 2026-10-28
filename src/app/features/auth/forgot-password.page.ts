import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { PhotoComponent } from '../../shared/ui/photo/photo.component';

@Component({
  selector: 'app-forgot-password-page',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, PhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './forgot-password.page.html',
  styleUrl: './auth.shared.scss',
})
export class ForgotPasswordPage {
  private readonly auth = inject(AuthService);
  protected readonly form = inject(FormBuilder).nonNullable.group({ email: ['', [Validators.required, Validators.email]] });
  protected readonly loading = signal(false);
  protected readonly sent = signal(false);
  protected readonly error = signal('');
  /** Solo en modo simulado: en producción este enlace llega por correo. */
  protected readonly simulatedToken = signal<string | null>(null);

  protected submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.loading.set(true);
    this.error.set('');
    this.auth.requestPasswordReset(this.form.getRawValue().email).subscribe({
      next: (token) => {
        this.loading.set(false);
        this.sent.set(true);
        this.simulatedToken.set(token);
      },
      error: (e: Error) => { this.loading.set(false); this.error.set(e.message); },
    });
  }
}
