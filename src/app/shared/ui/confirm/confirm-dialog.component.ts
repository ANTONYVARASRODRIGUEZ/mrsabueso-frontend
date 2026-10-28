import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ConfirmService } from '../../../core/services/confirm.service';
import { ModalComponent } from '../modal/modal.component';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [ModalComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (confirm.request(); as r) {
      <app-modal [heading]="r.title" width="440px" (closed)="confirm.answer(false)">
        <p class="msg">{{ r.message }}</p>
        <div class="actions">
          <button type="button" class="btn btn--outline" (click)="confirm.answer(false)">Cancelar</button>
          <button type="button" class="btn" [class.btn--primary]="!r.danger" [class.danger]="r.danger" (click)="confirm.answer(true)">{{ r.confirmText ?? 'Confirmar' }}</button>
        </div>
      </app-modal>
    }
  `,
  styles: [`
    .msg { color: var(--c-ink-2); margin-bottom: 1.4rem; }
    .actions { display: flex; justify-content: flex-end; gap: 0.7rem; }
    .danger { background: var(--c-danger); color: #fff; &:hover:not(:disabled) { background: #912018; } }
  `],
})
export class ConfirmDialogComponent {
  protected readonly confirm = inject(ConfirmService);
}
