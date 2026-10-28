import { ChangeDetectionStrategy, Component, ElementRef, NgZone, OnDestroy, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { User } from '../../../core/models';
import { AuthError, AuthService } from '../../../core/services/auth.service';

/** API mínima de Google Identity Services (script cargado en index.html). */
interface GoogleId {
  initialize(cfg: { client_id: string; callback: (r: { credential: string }) => void; ux_mode?: string }): void;
  renderButton(el: HTMLElement, opts: Record<string, unknown>): void;
}
declare global { interface Window { google?: { accounts: { id: GoogleId } } } }

/** Botón oficial "Continuar con Google". Emite el usuario cuando el backend confirma el ingreso. */
@Component({
  selector: 'app-google-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="g-wrap"><div #slot></div></div>
    @if (unavailable()) { <p class="g-note">No se pudo cargar el ingreso con Google. Revisa tu conexión o usa tu correo y contraseña.</p> }
  `,
  styles: [`
    :host { display: block; }
    .g-wrap { display: flex; justify-content: center; min-height: 44px; }
    .g-note { margin: 0.4rem 0 0; font-size: 0.85rem; color: var(--c-muted); text-align: center; }
  `],
})
export class GoogleButtonComponent implements OnDestroy {
  private readonly auth = inject(AuthService);
  private readonly zone = inject(NgZone);
  private readonly slot = viewChild.required<ElementRef<HTMLElement>>('slot');

  /** 'signin_with' (Iniciar sesión con Google) o 'signup_with' (Registrarse con Google). */
  readonly text = input<'signin_with' | 'signup_with' | 'continue_with'>('continue_with');
  readonly signedIn = output<User>();
  readonly failed = output<AuthError>();
  readonly busy = output<boolean>();
  protected readonly unavailable = signal(false);
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    afterNextRender(() => {
      let tries = 0;
      // El script de Google carga de forma asíncrona: se espera hasta ~8 s.
      this.timer = setInterval(() => {
        if (window.google?.accounts?.id) { clearInterval(this.timer); this.render(window.google.accounts.id); }
        else if (++tries > 40) { clearInterval(this.timer); this.unavailable.set(true); }
      }, 200);
    });
  }

  ngOnDestroy(): void { clearInterval(this.timer); }

  private render(gid: GoogleId): void {
    gid.initialize({
      client_id: environment.googleClientId,
      callback: ({ credential }) => this.zone.run(() => {
        this.busy.emit(true);
        this.auth.loginWithGoogle(credential).subscribe({
          next: (u) => { this.busy.emit(false); this.signedIn.emit(u); },
          error: (e: AuthError) => { this.busy.emit(false); this.failed.emit(e); },
        });
      }),
    });
    const width = Math.min(400, Math.max(220, this.slot().nativeElement.parentElement?.clientWidth ?? 320));
    gid.renderButton(this.slot().nativeElement, { theme: 'outline', size: 'large', shape: 'pill', text: this.text(), locale: 'es', width });
  }
}
