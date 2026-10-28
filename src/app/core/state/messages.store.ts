import { Injectable, computed, inject } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiDb, upsert } from '../data/api-db.service';
import { ContactMessage, MessageStatus, NewContactMessage } from '../models';

@Injectable({ providedIn: 'root' })
export class MessagesStore {
  private readonly db = inject(ApiDb);
  readonly all = computed(() => [...this.db.messages()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  readonly unread = computed(() => this.db.messages().filter((m) => m.status === 'new').length);

  send(msg: NewContactMessage): Observable<ContactMessage> {
    return this.db.req<ContactMessage>('POST', '/contact', msg);
  }

  setStatus(id: string, status: MessageStatus): void {
    this.db.fire(this.db.req<ContactMessage>('PATCH', `/messages/${id}/status`, { status }).pipe(tap((m) => this.db.messages.update((l) => upsert(l, m)))));
  }
  remove(id: string): void {
    this.db.fire(this.db.req('DELETE', `/messages/${id}`).pipe(tap(() => this.db.messages.update((l) => l.filter((m) => m.id !== id)))));
  }
}
