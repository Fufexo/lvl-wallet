import { Component, computed, input } from '@angular/core';

/**
 * Accessible horizontal meter. Height comes from the host classes, fill color from `fillClass`.
 *
 *   <app-progress-bar class="h-3" label="Gasto del límite mensual" [value]="140" [max]="200" />
 */
@Component({
  selector: 'app-progress-bar',
  host: {
    role: 'progressbar',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    '[attr.aria-label]': 'label()',
    '[attr.aria-valuenow]': 'percent()',
    '[attr.aria-valuetext]': 'valueText() ?? null',
    class: 'block overflow-hidden rounded-full bg-white/8',
  },
  template: `
    <div
      data-progress-fill
      class="h-full origin-left rounded-full"
      [class]="fillClass()"
      [style.width.%]="percent()"
    ></div>
  `,
})
export class ProgressBar {
  readonly value = input.required<number>();
  readonly max = input(100);
  readonly label = input.required<string>();
  /** Human reading of the value, e.g. "2,340 de 3,000 XP". */
  readonly valueText = input<string>();
  readonly fillClass = input('bg-lime');

  /** Value as a 0–100 integer, clamped. */
  readonly percent = computed(() => {
    const max = this.max();
    if (max <= 0) return 0;
    return Math.min(100, Math.max(0, Math.round((this.value() / max) * 100)));
  });
}
