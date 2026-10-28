import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../../core/services/toast.service';
import { IconComponent } from '../icon/icon.component';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="stack" aria-live="polite" aria-atomic="false">
      @for (t of toasts.toasts(); track t.id) {
        <div class="toast" [class]="'toast toast--' + t.kind" role="status">
          <app-icon [name]="t.kind === 'error' ? 'x' : 'check'" />
          <span>{{ t.message }}</span>
          <button type="button" (click)="toasts.dismiss(t.id)" aria-label="Cerrar aviso"><app-icon name="x" /></button>
        </div>
      }
    </div>
  `,
  styles: [`
    .stack { position: fixed; left: 1rem; bottom: 1rem; z-index: 200; display: grid; gap: 0.6rem; width: min(380px, calc(100% - 2rem)); }
    .toast {
      display: flex; align-items: center; gap: 0.7rem; padding: 0.8rem 1rem;
      background: var(--c-ink); color: #fff; border-radius: var(--radius); box-shadow: var(--shadow-lg);
      animation: in 0.2s ease-out;
      &--success app-icon:first-child { color: #5fd69b; }
      &--error app-icon:first-child { color: #ff8a80; }
      span { flex: 1; font-size: 0.95rem; }
      button { display: grid; place-items: center; background: none; border: 0; color: rgba(255,255,255,0.7); &:hover { color: #fff; } }
    }
    @keyframes in { from { opacity: 0; transform: translateY(8px); } }
  `],
})
export class ToastContainerComponent {
  protected readonly toasts = inject(ToastService);
}
