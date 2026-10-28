import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ContactMessage, MessageStatus } from '../../core/models';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { MessagesStore } from '../../core/state/messages.store';
import { ServicesStore } from '../../core/state/services.store';
import { SettingsStore } from '../../core/state/settings.store';
import { formatDate } from '../../core/utils/date';
import { IconComponent } from '../../shared/ui/icon/icon.component';

const LABEL: Record<MessageStatus, string> = { new: 'Nuevo', read: 'Leído', resolved: 'Resuelto' };
const TONE: Record<MessageStatus, string> = { new: 'warn', read: 'info', resolved: 'success' };

@Component({
  selector: 'app-messages-page',
  standalone: true,
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="adm-head"><div><h1>Mensajes</h1><p>Consultas enviadas desde el formulario de contacto · {{ store.unread() }} sin leer</p></div>
      <div class="actions"><div class="tabs seg">@for (f of filters; track f[0]) { <button type="button" [class.on]="filter() === f[0]" (click)="filter.set(f[0])">{{ f[1] }}</button> }</div></div></header>

    <div class="pane">
      <section class="adm-card list">
        @if (list().length === 0) { <p class="adm-empty">No hay mensajes.</p> }
        @for (m of list(); track m.id) {
          <button type="button" class="item" [class.on]="selectedId() === m.id" [class.unread]="m.status === 'new'" (click)="select(m)">
            <span class="top"><strong>{{ m.fullName }}</strong><small>{{ fmt(m.createdAt.slice(0, 10)) }}</small></span>
            <span class="snip">{{ m.message }}</span>
            <span class="badge" [class]="'badge badge--' + tone[m.status]">{{ label[m.status] }}</span>
          </button>
        }
      </section>

      <section class="adm-card detail">
        @if (selected(); as m) {
          <h2>{{ m.fullName }}</h2>
          <p class="muted">{{ m.phone }} · Interés: {{ serviceName(m.serviceId) }} · {{ fmt(m.createdAt.slice(0, 10)) }}</p>
          <p class="msg">{{ m.message }}</p>
          <div class="row-actions acts">
            <a class="btn btn--whatsapp btn--sm" [href]="wa(m)" target="_blank" rel="noopener"><app-icon name="whatsapp" /> Responder por WhatsApp</a>
            @if (m.status !== 'resolved') { <button type="button" class="btn btn--primary btn--sm" (click)="set(m, 'resolved')">Marcar resuelto</button> }
            @else { <button type="button" class="btn btn--outline btn--sm" (click)="set(m, 'read')">Reabrir</button> }
            @if (m.status !== 'new') { <button type="button" class="btn btn--outline btn--sm" (click)="set(m, 'new')">Marcar no leído</button> }
            <button type="button" class="icon-btn danger" (click)="remove(m)" aria-label="Eliminar mensaje"><app-icon name="trash" /></button>
          </div>
        } @else { <p class="adm-empty">Selecciona un mensaje para leerlo.</p> }
      </section>
    </div>
  `,
  styles: [`
    .pane { display: grid; grid-template-columns: 380px 1fr; gap: 1.1rem; align-items: start; } .list { padding: 0.5rem; display: grid; gap: 0.3rem; max-height: 70vh; overflow-y: auto; }
    .item { display: grid; gap: 0.25rem; padding: 0.8rem; text-align: left; background: none; border: 1px solid transparent; border-radius: 10px; justify-items: start; &:hover { background: #faf9f6; } &.on { background: var(--c-brand-50); border-color: var(--c-brand-100); } &.unread strong { color: var(--c-brand-600); }
      .top { display: flex; width: 100%; justify-content: space-between; gap: 0.5rem; } small { color: var(--c-muted); } .snip { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 0.88rem; color: var(--c-ink-2); } }
    .detail h2 { margin-bottom: 0.3rem; } .msg { margin: 1.2rem 0; padding: 1rem 1.1rem; font-size: 1rem; background: var(--c-bg); border-radius: var(--radius-sm); white-space: pre-wrap; } .acts { justify-content: flex-start; }
    .seg { margin: 0; border: 0; } @media (max-width: 960px) { .pane { grid-template-columns: 1fr; } }
  `],
})
export class MessagesPage {
  protected readonly store = inject(MessagesStore);
  private readonly services = inject(ServicesStore);
  private readonly settings = inject(SettingsStore);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmService);

  protected readonly filters: [MessageStatus | 'all', string][] = [['all', 'Todos'], ['new', 'Nuevos'], ['read', 'Leídos'], ['resolved', 'Resueltos']];
  protected readonly filter = signal<MessageStatus | 'all'>('all');
  protected readonly selectedId = signal<string | null>(null);
  protected readonly label = LABEL; protected readonly tone = TONE; protected readonly fmt = formatDate;

  protected readonly list = computed(() => this.store.all().filter((m) => this.filter() === 'all' || m.status === this.filter()));
  protected readonly selected = computed(() => this.store.all().find((m) => m.id === this.selectedId()) ?? null);

  protected serviceName(id: string): string { return this.services.byId(id)?.name ?? '—'; }
  protected select(m: ContactMessage): void { this.selectedId.set(m.id); if (m.status === 'new') this.store.setStatus(m.id, 'read'); }
  protected set(m: ContactMessage, s: MessageStatus): void { this.store.setStatus(m.id, s); this.toast.success('Mensaje actualizado.'); }
  protected wa(m: ContactMessage): string {
    return `https://wa.me/${m.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hola ${m.fullName}, te escribimos de ${this.settings.settings().name} por tu consulta.`)}`;
  }
  protected async remove(m: ContactMessage): Promise<void> {
    if (await this.confirm.ask({ title: 'Eliminar mensaje', message: `¿Eliminar el mensaje de ${m.fullName}?`, confirmText: 'Eliminar', danger: true })) { this.store.remove(m.id); this.selectedId.set(null); this.toast.success('Mensaje eliminado.'); }
  }
}
