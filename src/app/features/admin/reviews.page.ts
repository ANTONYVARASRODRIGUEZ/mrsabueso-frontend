import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Review } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { ReviewsStore } from '../../core/state/reviews.store';
import { formatDate } from '../../core/utils/date';
import { IconComponent } from '../../shared/ui/icon/icon.component';
import { StarRatingComponent } from '../../shared/ui/star-rating/star-rating.component';

@Component({
  selector: 'app-admin-reviews-page',
  standalone: true,
  imports: [FormsModule, IconComponent, StarRatingComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head"><div><h1>Reseñas</h1><p>Lo que opinan tus clientes. Las ocultas no se muestran en el sitio.</p></div></header>

    <div class="adm-grid two">
      <section class="adm-card sum">
        <div class="score"><strong>{{ store.average() ? store.average().toFixed(1) : '—' }}</strong><app-star-rating [value]="store.average()" [readonly]="true" /><small>{{ store.visible().length }} reseñas visibles</small></div>
        <div class="hbars">@for (d of dist(); track d.stars) { <div class="item"><div class="top"><span>{{ d.stars }} ★</span><strong>{{ d.count }}</strong></div><div class="track"><div class="fill" [style.width.%]="d.pct"></div></div></div> }</div>
      </section>
      <section class="adm-card">
        <div class="adm-filters" style="margin:0">
          <label class="f">Calificación<select class="input" [ngModel]="rating()" (ngModelChange)="rating.set($event)"><option value="all">Todas</option>@for (n of [5,4,3,2,1]; track n) { <option [value]="n">{{ n }} estrellas</option> }</select></label>
          <label class="f">Visibilidad<select class="input" [ngModel]="vis()" (ngModelChange)="vis.set($event)"><option value="all">Todas</option><option value="visible">Visibles</option><option value="hidden">Ocultas</option></select></label>
        </div>
      </section>
    </div>

    <div class="list">
      @if (filtered().length === 0) { <p class="adm-empty adm-card">No hay reseñas con esos filtros.</p> }
      @for (r of filtered(); track r.id) {
        <article class="adm-card rv" [class.hidden]="r.hidden">
          <div class="top"><app-star-rating [value]="r.rating" [readonly]="true" />
            <strong>{{ r.customerName }}</strong><span class="muted">{{ r.serviceName }} · {{ r.petName }} · {{ fmt(r.createdAt.slice(0, 10)) }}</span>
            @if (r.hidden) { <span class="badge badge--warn">Oculta</span> }</div>
          <p>“{{ r.comment || 'Sin comentario' }}”</p>
          @if (r.reply && replyingId() !== r.id) { <p class="reply"><strong>Tu respuesta:</strong> {{ r.reply }}</p> }
          @if (replyingId() === r.id) {
            <div class="reply-form"><textarea class="input" maxlength="300" placeholder="Escribe una respuesta pública…" [ngModel]="draft()" (ngModelChange)="draft.set($event)" [attr.aria-label]="'Respuesta a ' + r.customerName"></textarea>
              <div class="row-actions"><button type="button" class="btn btn--outline btn--sm" (click)="replyingId.set(null)">Cancelar</button><button type="button" class="btn btn--primary btn--sm" (click)="saveReply(r)">Publicar respuesta</button></div></div>
          }
          <div class="row-actions acts">
            <button type="button" class="btn btn--outline btn--sm" (click)="startReply(r)">{{ r.reply ? 'Editar respuesta' : 'Responder' }}</button>
            <button type="button" class="btn btn--outline btn--sm" (click)="toggle(r)">{{ r.hidden ? 'Mostrar en el sitio' : 'Ocultar' }}</button>
            <button type="button" class="icon-btn danger" (click)="remove(r)" aria-label="Eliminar reseña"><app-icon name="trash" /></button>
          </div>
        </article>
      }
    </div>
  `,
  styles: [`
    .sum { display: grid; grid-template-columns: 160px 1fr; gap: 1.4rem; align-items: center; } .score { display: grid; justify-items: center; gap: 0.3rem; strong { font: 700 2.6rem/1 var(--font-display); } small { color: var(--c-muted); text-align: center; } }
    .list { display: grid; gap: 0.9rem; margin-top: 1.1rem; } .rv { display: grid; gap: 0.6rem; &.hidden { opacity: 0.7; border-style: dashed; } } .top { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.8rem; }
    .reply { padding: 0.6rem 0.8rem; font-size: 0.92rem; background: var(--c-brand-50); border-radius: var(--radius-sm); } .reply-form { display: grid; gap: 0.6rem; } .acts { justify-content: flex-start; margin-top: 0.2rem; }
    @media (max-width: 560px) { .sum { grid-template-columns: 1fr; } }
  `],
})
export class AdminReviewsPage {
  protected readonly store = inject(ReviewsStore);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly rating = signal('all');
  protected readonly vis = signal<'all' | 'visible' | 'hidden'>('all');
  protected readonly replyingId = signal<string | null>(null);
  protected readonly draft = signal('');
  protected readonly fmt = formatDate;

  protected readonly filtered = computed(() => this.store.all().filter((r) =>
    (this.rating() === 'all' || r.rating === Number(this.rating())) && (this.vis() === 'all' || (this.vis() === 'hidden') === r.hidden)));
  protected readonly dist = computed(() => {
    const all = this.store.all(); const max = Math.max(1, ...[5, 4, 3, 2, 1].map((n) => all.filter((r) => r.rating === n).length));
    return [5, 4, 3, 2, 1].map((stars) => { const count = all.filter((r) => r.rating === stars).length; return { stars, count, pct: (count / max) * 100 }; });
  });

  protected startReply(r: Review): void { this.draft.set(r.reply ?? ''); this.replyingId.set(r.id); }
  protected saveReply(r: Review): void { this.store.reply(r.id, this.draft()); this.replyingId.set(null); this.toast.success('Respuesta guardada.'); }
  protected toggle(r: Review): void { this.store.toggleHidden(r.id); this.toast.success(r.hidden ? 'La reseña ahora es visible.' : 'La reseña fue ocultada.'); }
  protected async remove(r: Review): Promise<void> {
    if (await this.confirm.ask({ title: 'Eliminar reseña', message: 'Esta acción no se puede deshacer. Si solo quieres que no se muestre, usa “Ocultar”.', confirmText: 'Eliminar', danger: true })) { this.store.remove(r.id); this.toast.success('Reseña eliminada.'); }
  }
}
