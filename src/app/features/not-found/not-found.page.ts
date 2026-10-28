import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../../shared/ui/icon/icon.component';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="section"><div class="container box">
      <span class="ico"><app-icon name="paw" /></span>
      <h1>Ups, esta página se escapó</h1>
      <p class="lead">No encontramos lo que buscas, pero tu mascota sigue esperándote.</p>
      <div class="actions"><a routerLink="/" class="btn btn--primary btn--lg">Volver al inicio</a><a routerLink="/reservar" class="btn btn--outline btn--lg">Reservar cita</a></div>
    </div></section>
  `,
  styles: [`
    .box { display: grid; justify-items: center; gap: 0.9rem; text-align: center; padding-block: 3rem; }
    .ico { display: grid; place-items: center; width: 96px; height: 96px; color: var(--c-brand); background: var(--c-brand-50); border-radius: 50%; --icon-size: 48px; }
    h1 { font-size: clamp(1.8rem, 4vw, 2.6rem); } .actions { display: flex; flex-wrap: wrap; gap: 0.8rem; justify-content: center; margin-top: 0.8rem; }
  `],
})
export class NotFoundPage {}
