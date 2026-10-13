import { Component, input } from '@angular/core';

import { Currency, VirtualCard } from '../data/models';

/** The card face: brand, label, last digits, expiry and a frozen badge. */
@Component({
  selector: 'app-virtual-card-view',
  host: { class: 'block' },
  template: `
    <div
      class="relative flex aspect-[1.586] flex-col justify-between overflow-hidden rounded-[20px] border border-white/12 p-5 transition-[filter] sm:p-6"
      [class]="card().frozen ? 'bg-ink-3 grayscale' : 'bg-linear-to-br from-violet via-[#4a2a9a] to-ink-2'"
    >
      <div aria-hidden="true" class="pointer-events-none absolute -top-16 -right-10 size-48 rounded-full bg-lime/25 blur-3xl"></div>

      <div class="relative flex items-start justify-between gap-3">
        <span class="font-display text-lg font-black tracking-wider">LVL</span>
        @if (card().frozen) {
          <span class="rounded-full bg-ink/70 px-2.5 py-1 font-mono text-xs text-soft">Congelada</span>
        } @else {
          <span class="rounded-full bg-ink/40 px-2.5 py-1 font-mono text-xs text-soft">{{ currency() }}</span>
        }
      </div>

      <div class="relative flex flex-col gap-1">
        <span class="text-sm text-soft">{{ card().label }}</span>
        <span class="font-mono text-lg whitespace-nowrap tracking-[0.1em] sm:text-2xl">
          <span aria-hidden="true">•••• •••• •••• </span><span class="sr-only">Termina en </span>{{ card().last4 }}
        </span>
        <span class="font-mono text-xs text-soft">Vence {{ card().expiry }}</span>
      </div>
    </div>
  `,
})
export class VirtualCardView {
  readonly card = input.required<VirtualCard>();
  readonly currency = input.required<Currency>();
}
