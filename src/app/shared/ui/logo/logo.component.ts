import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-logo',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <svg class="mark" viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="#f26a21"/>
      <g fill="#fff">
        <ellipse cx="18" cy="28" rx="5" ry="6.5"/><ellipse cx="29" cy="19" rx="5" ry="6.5"/>
        <ellipse cx="41" cy="19" rx="5" ry="6.5"/><ellipse cx="47" cy="28" rx="5" ry="6.5"/>
        <path d="M32 30c-8 0-14 7-14 13 0 5 4 8 8 8 2.5 0 3.5-1.2 6-1.2s3.5 1.2 6 1.2c4 0 8-3 8-8 0-6-6-13-14-13z"/>
      </g>
    </svg>
    <span class="text"><strong>MR. SABUESO</strong><small [class.light]="light()">Veterinaria y Spa</small></span>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; gap: 0.65rem; }
    .mark { width: 42px; height: 42px; }
    .text { display: grid; line-height: 1.1; }
    strong { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; letter-spacing: 0.02em; }
    small { font-size: 0.72rem; color: var(--c-muted); letter-spacing: 0.04em; &.light { color: rgba(255,255,255,0.7); } }
  `],
})
export class LogoComponent {
  readonly light = input(false);
}
