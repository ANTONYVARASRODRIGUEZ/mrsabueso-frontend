import { ChangeDetectionStrategy, Component, effect, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { UiStore } from './core/state/ui.store';
import { AccountModalComponent } from './features/account/account-modal.component';
import { AddPetModalComponent } from './features/account/add-pet-modal.component';
import { FooterComponent } from './layout/footer/footer.component';
import { HeaderComponent } from './layout/header/header.component';
import { SettingsStore } from './core/state/settings.store';
import { PetRecordModalComponent } from './features/account/pet-record-modal.component';
import { ReviewModalComponent } from './features/account/review-modal.component';
import { RescheduleModalComponent } from './features/account/reschedule-modal.component';
import { ConfirmDialogComponent } from './shared/ui/confirm/confirm-dialog.component';
import { IconComponent } from './shared/ui/icon/icon.component';
import { ToastContainerComponent } from './shared/ui/toast/toast-container.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HeaderComponent, FooterComponent, AccountModalComponent, AddPetModalComponent, ToastContainerComponent, IconComponent, PetRecordModalComponent, ReviewModalComponent, RescheduleModalComponent, ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a class="skip" href="#contenido">Saltar al contenido</a>
    @if (!isAdmin()) { <app-header /> }
    <main id="contenido" tabindex="-1" [class.admin]="isAdmin()"><router-outlet /></main>
    @if (!isAdmin()) { <app-footer /> }
    @if (!isAdmin()) {
      <a class="fab" [href]="wa()" target="_blank" rel="noopener" aria-label="Escribir por WhatsApp"><app-icon name="whatsapp" /></a>
    }
    @if (ui.accountOpen()) { <app-account-modal /> }
    @if (ui.addPetOpen()) { <app-add-pet-modal /> }
    @if (ui.petRecordId()) { <app-pet-record-modal /> }
    @if (ui.reviewTarget()) { <app-review-modal /> }
    @if (ui.rescheduleTarget()) { <app-reschedule-modal /> }
    <app-confirm-dialog />
    <app-toast-container />
  `,
  styles: [`
    main { min-height: calc(100dvh - var(--header-h) - 260px); outline: none; &.admin { min-height: 100dvh; } }
    .fab { position: fixed; right: 1.1rem; bottom: 1.1rem; z-index: 60; display: grid; place-items: center; width: 56px; height: 56px; color: #fff; background: #1fa855; border-radius: 50%; box-shadow: 0 10px 26px rgba(31,168,85,0.45); --icon-size: 28px; transition: transform 0.15s; &:hover { transform: scale(1.07); } }
    .skip { position: absolute; left: -999px; top: 0; z-index: 300; padding: 0.6rem 1rem; background: var(--c-ink); color: #fff; &:focus { left: 0; } }
  `],
})
export class AppComponent {
  protected readonly ui = inject(UiStore);
  private readonly settings = inject(SettingsStore);
  protected wa(): string { return this.settings.whatsappLink(`Hola ${this.settings.settings().name}, quisiera hacer una consulta.`); }
  private readonly doc = inject(DOCUMENT);
  private readonly router = inject(Router);
  protected readonly isAdmin = toSignal(
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd), map(() => this.router.url.startsWith('/admin'))),
    { initialValue: this.router.url.startsWith('/admin') },
  );

  constructor() {
    effect(() => this.doc.body.classList.toggle('modal-open', this.ui.anyModalOpen()));
  }
}
