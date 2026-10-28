import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/services/toast.service';
import { ReviewsStore } from '../../core/state/reviews.store';
import { UiStore } from '../../core/state/ui.store';
import { formatDate } from '../../core/utils/date';
import { ModalComponent } from '../../shared/ui/modal/modal.component';
import { StarRatingComponent } from '../../shared/ui/star-rating/star-rating.component';

@Component({
  selector: 'app-review-modal',
  standalone: true,
  imports: [ModalComponent, StarRatingComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (ui.reviewTarget(); as a) {
      <app-modal heading="Califica tu experiencia" width="460px" (closed)="close()">
        <p class="what"><strong>{{ a.serviceName }}</strong> · {{ a.petName }} · {{ date(a.date) }}</p>
        <div class="field"><span class="label">¿Cómo fue la atención?</span><app-star-rating [(value)]="rating" /></div>
        <div class="field">
          <label for="rv-c">Cuéntanos más <span class="hint">(opcional)</span></label>
          <textarea id="rv-c" class="input" maxlength="400" placeholder="¿Qué fue lo que más te gustó?" [ngModel]="comment()" (ngModelChange)="comment.set($event)"></textarea>
        </div>
        <button type="button" class="btn btn--primary btn--lg btn--block" [disabled]="rating() === 0 || saving()" (click)="send()">{{ saving() ? 'Enviando…' : 'Enviar calificación' }}</button>
      </app-modal>
    }
  `,
  styles: [`.what { margin-bottom: 1.2rem; color: var(--c-ink-2); }`],
})
export class ReviewModalComponent {
  protected readonly ui = inject(UiStore);
  private readonly reviews = inject(ReviewsStore);
  private readonly toast = inject(ToastService);
  protected readonly rating = signal(0);
  protected readonly comment = signal('');
  protected readonly saving = signal(false);
  protected readonly date = formatDate;

  protected close(): void { this.ui.reviewTarget.set(null); }

  protected send(): void {
    const a = this.ui.reviewTarget();
    if (!a || this.rating() === 0) return;
    this.saving.set(true);
    this.reviews.add(a, this.rating(), this.comment()).subscribe({
      next: () => { this.toast.success('¡Gracias por tu calificación!'); this.close(); },
      error: (e: Error) => { this.saving.set(false); this.toast.error(e.message); },
    });
  }
}
