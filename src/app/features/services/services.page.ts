import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ServicesStore } from '../../core/state/services.store';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PhotoComponent } from '../../shared/ui/photo/photo.component';

@Component({
  selector: 'app-services-page',
  standalone: true,
  imports: [RouterLink, IconComponent, PhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './services.page.html',
  styleUrl: './services.page.scss',
})
export class ServicesPage {
  protected readonly services = inject(ServicesStore).active;
  /** Permite abrir directo un servicio: /servicios?servicio=dental */
  readonly servicio = input<string>();
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed(() => this.services().find((s) => s.id === this.selectedId()) ?? null);

  constructor() {
    effect(() => {
      const id = this.servicio();
      if (id && this.services().some((s) => s.id === id)) this.selectedId.set(id);
    });
  }

  protected toggle(id: string): void {
    this.selectedId.update((cur) => (cur === id ? null : id));
  }
}
