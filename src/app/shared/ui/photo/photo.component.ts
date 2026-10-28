import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { IconName } from '../../../core/models';
import { IconComponent } from '../icon/icon.component';

/**
 * Foto con relación de aspecto fija, carga diferida y respaldo elegante
 * si la imagen aún no existe en /public/images.
 */
@Component({
  selector: 'app-photo',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!failed()) {
      <img [src]="src()" [alt]="alt()" [attr.loading]="eager() ? 'eager' : 'lazy'" decoding="async" (error)="failed.set(true)">
    } @else {
      <div class="fallback" role="img" [attr.aria-label]="alt()"><app-icon [name]="icon()" /></div>
    }
  `,
  styleUrl: './photo.component.scss',
  host: { '[style.aspect-ratio]': 'ratio()' },
})
export class PhotoComponent {
  readonly src = input.required<string>();
  readonly alt = input.required<string>();
  readonly ratio = input('4 / 3');
  readonly icon = input<IconName>('paw');
  readonly eager = input(false);
  protected readonly failed = signal(false);
}
