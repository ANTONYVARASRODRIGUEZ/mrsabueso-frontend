import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SettingsStore } from '../../core/state/settings.store';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { LogoComponent } from '../../shared/ui/logo/logo.component';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [RouterLink, IconComponent, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss',
})
export class FooterComponent {
  private readonly store = inject(SettingsStore);
  protected readonly year = new Date().getFullYear();
  protected readonly s = this.store.settings;
  protected readonly schedule = this.store.schedule;
  protected readonly maps = this.store.mapsLink;
  protected wa(): string { return this.store.whatsappLink(); }
}
