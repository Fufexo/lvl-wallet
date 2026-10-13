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
  | 'arrow-left';

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
      }
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly strokeWidth = input(2);
}
