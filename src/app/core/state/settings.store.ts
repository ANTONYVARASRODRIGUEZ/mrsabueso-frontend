import { Injectable, computed, inject } from '@angular/core';
import { DAY_NAMES, DEFAULT_SETTINGS, DISPLAY_DAY_ORDER, whatsappUrl } from '../config/business';
import { tap } from 'rxjs';
import { ApiDb } from '../data/api-db.service';
import { BusinessSettings } from '../models';
import { formatTime } from '../utils/date';

@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly db = inject(ApiDb);
  readonly settings = computed<BusinessSettings>(() => ({ ...DEFAULT_SETTINGS, ...this.db.settings() }));

  /** Horario de atención listo para mostrar (lunes a domingo). */
  readonly schedule = computed(() => DISPLAY_DAY_ORDER.map((d) => {
    const h = this.settings().hours.find((x) => x.day === d);
    return { day: DAY_NAMES[d], text: h?.open ? `${formatTime(h.from)} – ${formatTime(h.to)}` : 'Cerrado', open: !!h?.open };
  }));

  readonly mapsLink = computed(() => {
    const s = this.settings();
    return s.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.name} ${s.address}`.trim())}`;
  });

  whatsappLink(text?: string): string { return whatsappUrl(this.settings().whatsapp, text); }
  update(next: BusinessSettings): void {
    this.db.fire(this.db.req<BusinessSettings>('PUT', '/settings', next).pipe(tap((s) => this.db.settings.set(s))));
  }
}
