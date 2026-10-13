import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';

import { Icon, IconName } from '../../../shared/ui/icon';
import { ProgressBar } from '../../../shared/ui/progress-bar';

export interface Movement {
  readonly title: string;
  readonly meta: string;
  readonly amount: string;
  readonly tone: 'violet' | 'lime';
  readonly icon: IconName;
}

/** Product preview: balance, level progress and latest movements. */
@Component({
  selector: 'app-wallet-card',
  imports: [DecimalPipe, Icon, ProgressBar],
  host: { class: 'glass relative flex flex-col gap-5 rounded-card p-7 shadow-float' },
  template: `
    <div class="flex items-center justify-between">
      <span class="text-sm text-label">Saldo total</span>
      <span class="rounded-full bg-lime/12 px-2.5 py-1.5 font-mono text-xs text-lime">{{ trend() }}</span>
    </div>

    <p class="m-0 font-mono text-[clamp(36px,4vw,48px)] font-bold tracking-[-0.02em]">
      S/ {{ whole() }}.<span class="text-faint">{{ cents() }}</span>
    </p>

    <div class="flex flex-col gap-2">
      <div class="flex justify-between text-[13px] text-muted">
        <span>Nivel {{ level() }} · {{ rank() }}</span>
        <span class="font-mono">{{ xp() | number }} / {{ xpGoal() | number }} XP</span>
      </div>
      <app-progress-bar
        data-hero="xp"
        class="h-2.5"
        label="Progreso al siguiente nivel"
        fillClass="bg-linear-to-r from-violet to-lime shadow-[0_0_18px_var(--color-lime)]"
        [value]="xp()"
        [max]="xpGoal()"
        [valueText]="(xp() | number) + ' de ' + (xpGoal() | number) + ' XP'"
      />
    </div>

    <ul class="m-0 flex list-none flex-col border-t border-white/8 p-0 pt-1.5">
      @for (m of movements(); track m.title) {
        <li class="flex items-center gap-3.5 py-2.5">
          <span
            class="grid size-10 place-items-center rounded-xl"
            [class]="m.tone === 'violet' ? 'bg-violet/18 text-lilac' : 'bg-lime/14 text-lime'"
          >
            <app-icon [name]="m.icon" class="size-5" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="m-0 font-medium">{{ m.title }}</p>
            <p class="m-0 text-[13px] text-subtle">{{ m.meta }}</p>
          </div>
          <span class="font-mono">{{ m.amount }}</span>
        </li>
      }
    </ul>
  `,
})
export class WalletCard {
  /** Balance in soles. */
  readonly balance = input.required<number>();
  readonly trend = input.required<string>();
  readonly level = input.required<number>();
  readonly rank = input.required<string>();
  readonly xp = input.required<number>();
  readonly xpGoal = input.required<number>();
  readonly movements = input.required<readonly Movement[]>();

  protected readonly whole = computed(() => Math.trunc(this.balance()).toLocaleString('en-US'));
  protected readonly cents = computed(() => this.balance().toFixed(2).split('.')[1]);
}
