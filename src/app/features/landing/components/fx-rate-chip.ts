import { Component, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { ExchangeRate } from '../../../core/exchange-rate';

/** Floating chip with the live USD → PEN rate. */
@Component({
  selector: 'app-fx-rate-chip',
  imports: [DecimalPipe],
  host: {
    class: 'glass flex items-center gap-3 rounded-panel px-4.5 py-3.5 shadow-[0_20px_50px_rgb(0_0_0/0.45)]',
    'aria-live': 'polite',
  },
  template: `
    <span
      aria-hidden="true"
      class="size-2.5 rounded-full"
      [class]="fx.status() === 'error' ? 'bg-ember' : 'bg-lime shadow-[0_0_10px_var(--color-lime)] animate-pulse'"
    ></span>
    <div>
      <p class="m-0 text-xs text-label">Tipo de cambio en vivo</p>
      <p class="m-0 font-mono font-bold">
        @switch (fx.status()) {
          @case ('ready') { US$ 1 = S/ {{ fx.usdToPen() | number: '1.3-3' }} }
          @case ('error') { No disponible }
          @default { Cargando… }
        }
      </p>
    </div>
  `,
})
export class FxRateChip {
  protected readonly fx = inject(ExchangeRate);
}
