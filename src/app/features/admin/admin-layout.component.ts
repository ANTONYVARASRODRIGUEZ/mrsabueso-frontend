import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { IconName } from '../../core/models';
import { AppointmentsStore } from '../../core/state/appointments.store';
import { MessagesStore } from '../../core/state/messages.store';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { LogoComponent } from '../../shared/ui/logo/logo.component';

interface NavItem { label: string; path: string; icon: IconName; exact?: boolean; badge?: () => number; }

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="adm">
      <aside class="adm-side" [class.open]="open()" aria-label="Menú del panel">
        <a class="brand" routerLink="/" title="Ir al sitio web" aria-label="MR. SABUESO: ir al sitio web"><app-logo [light]="true" /></a>
        <nav>
          @for (n of nav; track n.path) {
            <a [routerLink]="n.path" routerLinkActive="is-active" [routerLinkActiveOptions]="{ exact: !!n.exact }" (click)="open.set(false)">
              <app-icon [name]="n.icon" /> {{ n.label }}
              @if (n.badge && n.badge() > 0) { <span class="count">{{ n.badge() }}</span> }
            </a>
          }
        </nav>
        <div class="grow"></div>
        <div class="me">
          <span>Sesión: <strong>{{ auth.user()?.fullName }}</strong></span>
          <button type="button" (click)="logout()"><app-icon name="logout" /> Cerrar sesión</button>
        </div>
      </aside>

      <div class="adm-main">
        <div class="adm-top"><button type="button" (click)="open.set(!open())" aria-label="Abrir menú"><app-icon name="menu" /></button><strong>Panel de administración</strong></div>
        <router-outlet />
      </div>
    </div>
  `,
})
export class AdminLayoutComponent {
  protected readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly appts = inject(AppointmentsStore);
  private readonly messages = inject(MessagesStore);
  protected readonly open = signal(false);

  private readonly pending = computed(() => this.appts.all().filter((a) => a.status === 'pending' && a.date >= new Date().toISOString().slice(0, 10)).length);

  /** Citas de hoy y mañana que aún no tienen recordatorio enviado. */
  private readonly toRemind = computed(() => {
    const to = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    const today = new Date().toISOString().slice(0, 10);
    return this.appts.all().filter((a) => (a.status === 'pending' || a.status === 'confirmed') && a.date >= today && a.date <= to && !a.reminderSentAt).length;
  });

  protected readonly nav: NavItem[] = [
    { label: 'Resumen', path: '/admin', icon: 'chart', exact: true },
    { label: 'Citas', path: '/admin/citas', icon: 'list', badge: () => this.pending() },
    { label: 'Agenda', path: '/admin/agenda', icon: 'calendar' },
    { label: 'Clientes', path: '/admin/clientes', icon: 'users' },
    { label: 'Mascotas', path: '/admin/mascotas', icon: 'paw' },
    { label: 'Recordatorios', path: '/admin/recordatorios', icon: 'mail', badge: () => this.toRemind() },
    { label: 'Reportes', path: '/admin/reportes', icon: 'file' },
    { label: 'Servicios', path: '/admin/servicios', icon: 'scissors' },
    { label: 'Reseñas', path: '/admin/resenas', icon: 'star' },
    { label: 'Mensajes', path: '/admin/mensajes', icon: 'message', badge: () => this.messages.unread() },
    { label: 'Administradores', path: '/admin/administradores', icon: 'shield' },
    { label: 'Configuración', path: '/admin/configuracion', icon: 'settings' },
  ];

  protected logout(): void {
    this.auth.logout();
    void this.router.navigateByUrl('/');
  }
}
