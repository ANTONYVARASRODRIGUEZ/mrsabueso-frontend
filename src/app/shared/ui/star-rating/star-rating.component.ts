import { ChangeDetectionStrategy, Component, input, model } from '@angular/core';

/** Estrellas de calificación: solo lectura o interactivas (radiogroup accesible). */
@Component({
  selector: 'app-star-rating',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (readonly()) {
      <span class="stars" role="img" [attr.aria-label]="value() + ' de 5 estrellas'">
        @for (n of stars; track n) { <svg viewBox="0 0 24 24" [class.on]="n <= roundedValue()" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg> }
      </span>
    } @else {
      <span class="stars interactive" role="radiogroup" aria-label="Calificación">
        @for (n of stars; track n) {
          <button type="button" role="radio" [attr.aria-checked]="value() === n" [attr.aria-label]="n + (n === 1 ? ' estrella' : ' estrellas')" (click)="value.set(n)">
            <svg viewBox="0 0 24 24" [class.on]="n <= value()" aria-hidden="true"><path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/></svg>
          </button>
        }
      </span>
    }
  `,
  styles: [`
    .stars { display: inline-flex; gap: 0.1rem; vertical-align: middle; }
    svg { width: var(--star-size, 1.1rem); height: var(--star-size, 1.1rem); fill: #e4e0d8; stroke: none; transition: fill 0.12s; &.on { fill: #f5a524; } }
    .interactive { --star-size: 2rem; }
    button { padding: 0.1rem; background: none; border: 0; border-radius: 6px; &:hover svg { fill: #f8c768; } }
  `],
})
export class StarRatingComponent {
  readonly value = model(0);
  readonly readonly = input(false);
  protected readonly stars = [1, 2, 3, 4, 5];
  protected roundedValue(): number { return Math.round(this.value()); }
}
