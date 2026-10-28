import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { PhotoComponent } from '../../shared/ui/photo/photo.component';

@Component({
  selector: 'app-about-page',
  standalone: true,
  imports: [RouterLink, IconComponent, PhotoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about.page.html',
  styleUrl: './about.page.scss',
})
export class AboutPage {
  protected readonly values = [
    { icon: 'heart' as const, title: 'Cariño en cada visita', text: 'Tratamos a cada mascota como si fuera nuestra.' },
    { icon: 'shield' as const, title: 'Estándares altos', text: 'Atención médica preventiva con los más altos estándares.' },
    { icon: 'star' as const, title: 'Experiencia integral', text: 'Salud, belleza y pet shop en un solo lugar.' },
  ];
}
