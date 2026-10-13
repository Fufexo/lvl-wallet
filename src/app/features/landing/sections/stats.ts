import { Component } from '@angular/core';

import { CountUp } from '../../../core/motion/count-up';
import { Reveal } from '../../../core/motion/reveal';

interface Stat {
  readonly prefix?: string;
  readonly value?: number;
  readonly suffix?: string;
  readonly text?: string;
  readonly label: string;
  readonly tone: 'lime' | 'fg' | 'lilac';
}

@Component({
  selector: 'app-stats',
  imports: [CountUp, Reveal],
  host: { class: 'block' },
  template: `
    <section aria-label="LVL en números" class="relative z-10 pt-10 pb-24">
      <ul
        appReveal="children"
        class="page-container m-0 grid list-none grid-cols-2 gap-4 lg:grid-cols-4"
      >
        @for (stat of stats; track stat.label) {
          <li class="glass rounded-tile p-7">
            <p
              class="m-0 font-display text-[clamp(36px,4vw,56px)] leading-none font-black"
              [class.text-lime]="stat.tone === 'lime'"
              [class.text-lilac]="stat.tone === 'lilac'"
            >
              @if (stat.value !== undefined) {
                {{ stat.prefix }}<span [appCountUp]="stat.value">{{ stat.value }}</span>{{ stat.suffix }}
              } @else {
                {{ stat.text }}
              }
            </p>
            <p class="mt-3 mb-0 text-muted">{{ stat.label }}</p>
          </li>
        }
      </ul>
    </section>
  `,
})
export class Stats {
  protected readonly stats: readonly Stat[] = [
    { value: 0, suffix: '%', label: 'Comisión en recargas y gift cards', tone: 'lime' },
    { value: 3, suffix: 's', label: 'Transferencias entre jugadores', tone: 'fg' },
    { text: 'S/·$', label: 'Cuentas en soles y dólares', tone: 'fg' },
    { value: 5, suffix: '%', label: 'Cashback máximo al nivel 30', tone: 'lilac' },
  ];
}
