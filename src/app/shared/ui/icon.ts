import { Component, input } from '@angular/core';

export type IconName =
  | 'arrow-right'
  | 'swap'
  | 'gift'
  | 'shield-check'
  | 'gamepad'
  | 'screen'
  | 'lock'
  | 'fingerprint'
  | 'bell'
  | 'freeze'
  | 'menu'
  | 'close'
  | 'arrow-left'
  | 'home'
  | 'list'
  | 'send'
  | 'calculator'
  | 'logout'
  | 'refresh'
  | 'search'
  | 'check'
  | 'alert'
  | 'wallet'
  | 'coins'
  | 'chevron-right'
  | 'card'
  | 'users'
  | 'more'
  | 'trash'
  | 'sparkle'
  | 'chevron-down'
  | 'target'
  | 'tag'
  | 'flag'
  | 'lock-open'
  | 'eye'
  | 'eye-off'
  | 'cloud';

/**
 * Decorative stroke icon on a 24×24 grid. Size and color come from the host classes,
 * and it is always hidden from assistive tech — put the meaning in nearby text.
 *
 *   <app-icon name="lock" class="size-5 text-lime" />
 */
@Component({
  selector: 'app-icon',
  host: { class: 'inline-block shrink-0', 'aria-hidden': 'true' },
  template: `
    <svg
      class="block size-full"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      [attr.stroke-width]="strokeWidth()"
    >
      @switch (name()) {
        @case ('arrow-right') { <path d="M5 12h14" /><path d="m13 6 6 6-6 6" /> }
        @case ('swap') { <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" /> }
        @case ('gift') {
          <rect x="3" y="8" width="18" height="13" rx="2" /><path d="M12 8v13M3 12h18" />
          <path d="M12 8c-2-4-6-4-6-1.5S10 8 12 8zM12 8c2-4 6-4 6-1.5S14 8 12 8z" />
        }
        @case ('shield-check') { <path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z" /><path d="m9 12 2 2 4-4" /> }
        @case ('gamepad') {
          <rect x="2" y="6" width="20" height="12" rx="4" /><path d="M6 12h4M8 10v4" />
          <circle cx="15" cy="11" r="1" /><circle cx="17.5" cy="13" r="1" />
        }
        @case ('screen') { <rect x="3" y="5" width="18" height="12" rx="2" /><path d="m10 9 4 2-4 2z" /><path d="M8 21h8" /> }
        @case ('lock') { <rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /> }
        @case ('fingerprint') {
          <path d="M12 11c0 3-1 6-3 8" /><path d="M8 7a5 5 0 0 1 9 3c0 4-1 7-2 9" /><path d="M4 12a8 8 0 0 1 14-5" />
        }
        @case ('bell') { <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10 21a2 2 0 0 0 4 0" /> }
        @case ('freeze') { <path d="M12 2v20M4.9 4.9l14.2 14.2M2 12h20M4.9 19.1 19.1 4.9" /> }
        @case ('menu') { <path d="M4 7h16M4 12h16M4 17h16" /> }
        @case ('close') { <path d="M6 6l12 12M18 6 6 18" /> }
        @case ('arrow-left') { <path d="M19 12H5" /><path d="m11 18-6-6 6-6" /> }
        @case ('home') { <path d="M3 11 12 4l9 7" /><path d="M5 10v10h14V10" /><path d="M10 20v-6h4v6" /> }
        @case ('list') { <path d="M9 6h11M9 12h11M9 18h11" /><path d="M4 6h.01M4 12h.01M4 18h.01" /> }
        @case ('send') { <path d="M21 3 10 14" /><path d="m21 3-7 18-4-7-7-4z" /> }
        @case ('calculator') {
          <rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8" />
          <path d="M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" />
        }
        @case ('logout') { <path d="M15 4h4v16h-4" /><path d="M10 8l-4 4 4 4" /><path d="M6 12h10" /> }
        @case ('refresh') { <path d="M20 11a8 8 0 1 0-2.3 5.7" /><path d="M20 4v7h-7" /> }
        @case ('search') { <circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /> }
        @case ('check') { <path d="m5 12 5 5 9-10" /> }
        @case ('alert') { <circle cx="12" cy="12" r="9" /><path d="M12 7v6" /><path d="M12 16.5h.01" /> }
        @case ('wallet') {
          <path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1z" /><path d="M4 7l11-3v3" />
          <path d="M16 13.5h.01" />
        }
        @case ('coins') {
          <ellipse cx="9" cy="7" rx="5" ry="2.5" /><path d="M4 7v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5V7" />
          <path d="M10 15.5c.6 1.2 2.6 2 5 2 2.8 0 5-1.1 5-2.5v-4c0-1.4-2.2-2.5-5-2.5" />
        }
        @case ('chevron-right') { <path d="m9 6 6 6-6 6" /> }
        @case ('chevron-down') { <path d="m6 9 6 6 6-6" /> }
        @case ('target') { <circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /> }
        @case ('tag') { <path d="M3 12V4h8l10 10-8 8z" /><circle cx="7.5" cy="8.5" r="1.5" /> }
        @case ('flag') { <path d="M5 21V4" /><path d="M5 4h11l-2 4 2 4H5" /> }
        @case ('lock-open') { <rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 7.5-2" /> }
        @case ('eye') { <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /> }
        @case ('eye-off') {
          <path d="M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.2M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
          <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
        }
        @case ('cloud') { <path d="M7 18a5 5 0 0 1-.5-10A6 6 0 0 1 18 9a4.5 4.5 0 0 1-.5 9z" /> }
        @case ('card') { <rect x="2.5" y="5" width="19" height="14" rx="2.5" /><path d="M2.5 10h19M6.5 15h4" /> }
        @case ('users') {
          <circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
          <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8" />
        }
        @case ('more') { <circle cx="5" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="19" cy="12" r="1.2" /> }
        @case ('trash') { <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /><path d="M10 11v6M14 11v6" /> }
        @case ('sparkle') { <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 15l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" /> }
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly strokeWidth = input(2);
}
