import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { ExchangeRate } from '../../../core/exchange-rate';
import { Icon } from '../../../shared/ui/icon';

/** PEN → USD converter that uses the live exchange rate. */
@Component({
  selector: 'app-fx-converter',
  imports: [DecimalPipe, Icon],
  host: { class: 'flex flex-col gap-3' },
  template: `
    <div class="panel flex items-center justify-between gap-4 rounded-panel px-5 py-4">
      <div class="min-w-0">
        <label for="fx-amount" class="text-[13px] text-subtle">
          Envías<span class="sr-only"> en soles</span>
        </label>
        <div class="flex items-baseline gap-2 font-mono text-[26px] font-bold">
          <span aria-hidden="true">S/</span>
          <input
            id="fx-amount"
            type="number"
            inputmode="decimal"
            min="0"
            step="10"
            class="w-full min-w-0 bg-transparent font-mono text-[26px] font-bold text-fg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            [value]="amountPen()"
            (input)="onAmount($event)"
          />
        </div>
      </div>
      <span class="rounded-[10px] bg-white/7 px-3 py-2 font-mono text-sm">PEN</span>
    </div>

    <div class="grid place-items-center">
      <span class="grid size-10 place-items-center rounded-full bg-lime text-ink">
        <app-icon name="swap" class="size-[18px]" [strokeWidth]="2.4" />
      </span>
    </div>

    <div class="flex items-center justify-between gap-4 rounded-panel border border-lime/25 bg-lime/7 px-5 py-4">
      <div>
        <p class="m-0 text-[13px] text-subtle">Recibes</p>
        <p class="m-0 font-mono text-[26px] font-bold text-lime" aria-live="polite">
          @if (amountUsd(); as usd) {
            US$ {{ usd | number: '1.2-2' }}
          } @else {
            US$ —
          }
        </p>
      </div>
      <span class="rounded-[10px] bg-white/7 px-3 py-2 font-mono text-sm">USD</span>
    </div>
  `,
})
export class FxConverter {
  private readonly fx = inject(ExchangeRate);

  protected readonly amountPen = signal(200);
  protected readonly amountUsd = computed(() => {
    const rate = this.fx.usdToPen();
    return rate ? this.amountPen() / rate : null;
  });

  protected onAmount(event: Event): void {
    const value = Number((event.target as HTMLInputElement).value);
    this.amountPen.set(Number.isFinite(value) && value >= 0 ? value : 0);
  }
}
