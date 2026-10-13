import { Component, computed, input } from '@angular/core';

import { Icon, IconName } from '../../../shared/ui/icon';
import { MoneyPipe } from '../../../shared/ui/money';
import { CATEGORY_LABELS, Category, Currency, Transaction } from '../data/models';
import { timeLabel } from '../data/dates';

const ICONS: Record<Category, IconName> = {
  juegos: 'gamepad',
  suscripciones: 'screen',
  'gift-cards': 'gift',
  transferencias: 'swap',
  recargas: 'wallet',
  cashback: 'coins',
  ahorro: 'target',
  recompensas: 'sparkle',
};

/** One movement: what, when, which account, how much and the XP it earned. */
@Component({
  selector: 'app-transaction-row',
  imports: [Icon, MoneyPipe],
  host: { class: 'flex items-center gap-3.5 py-3' },
  template: `
    <span
      class="grid size-10 flex-none place-items-center rounded-xl"
      [class]="tx().amount > 0 ? 'bg-lime/14 text-lime' : 'bg-violet/18 text-lilac'"
    >
      <app-icon [name]="icon()" class="size-5" />
    </span>
    <div class="min-w-0 flex-1">
      <p class="m-0 line-clamp-2 font-medium">{{ tx().description }}</p>
      <p class="m-0 text-[13px] text-subtle">
        {{ category() }} · {{ time() }}@if (meta(); as extra) { · {{ extra }} }
      </p>
    </div>
    <div class="flex flex-none flex-col items-end gap-1">
      @if (tx().amount !== 0) {
        <span class="font-mono" [class.text-lime]="tx().amount > 0">{{ tx().amount | money: currency() : true }}</span>
      } @else {
        <span class="text-sm text-subtle">Bonus</span>
      }
      @if (tx().xp > 0) {
        <span class="rounded-full bg-violet/18 px-2 py-0.5 font-mono text-[11px] text-lilac">+{{ tx().xp }} XP</span>
      }
    </div>
  `,
})
export class TransactionRow {
  readonly tx = input.required<Transaction>();
  readonly currency = input.required<Currency>();
  /** Extra context for the subtitle, e.g. the day or the account. */
  readonly meta = input<string>();

  protected readonly icon = computed(() => ICONS[this.tx().category]);
  protected readonly category = computed(() => CATEGORY_LABELS[this.tx().category]);
  protected readonly time = computed(() => timeLabel(this.tx().date));
}
