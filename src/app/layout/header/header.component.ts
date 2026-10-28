import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { UiStore } from '../../core/state/ui.store';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { LogoComponent } from '../../shared/ui/logo/logo.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, IconComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  protected readonly auth = inject(AuthService);
  private readonly ui = inject(UiStore);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  protected readonly open = signal(false);

  protected readonly links = [
    { label: 'Inicio', path: '/', exact: true },
    { label: 'Servicios', path: '/servicios', exact: false },
    { label: 'Nosotros', path: '/nosotros', exact: false },
    { label: 'Contacto', path: '/contacto', exact: false },
  ];

  protected toggle(): void { this.open.update((v) => !v); }
  protected close(): void { this.open.set(false); }
  protected openAccount(): void { this.close(); this.ui.openAccount(); }
  protected logout(): void {
    this.close();
    this.auth.logout();
    this.toast.success('Sesión cerrada.');
    void this.router.navigateByUrl('/');
  }
}
