import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions { title: string; message: string; confirmText?: string; danger?: boolean; }

@Injectable({ providedIn: 'root' })
export class ConfirmService {
  readonly request = signal<(ConfirmOptions & { resolve: (ok: boolean) => void }) | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    return new Promise((resolve) => this.request.set({ ...options, resolve }));
  }
  answer(ok: boolean): void {
    this.request()?.resolve(ok);
    this.request.set(null);
  }
}
