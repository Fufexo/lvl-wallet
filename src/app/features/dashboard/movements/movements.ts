import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { FormField, form } from '@angular/forms/signals';

import { NOW } from '../../../core/clock';
import { Icon } from '../../../shared/ui/icon';
import { BankStore } from '../data/bank-store';
import { dayLabel } from '../data/dates';
import { CATEGORY_LABELS, Category, Transaction } from '../data/models';
import { TransactionRow } from '../ui/transaction-row';

interface Filters {
  query: string;
  account: string;
  category: Category | 'todas';
}

interface DayGroup {
  readonly label: string;
  readonly items: readonly Transaction[];
}

const normalize = (text: string) =>
  text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

@Component({
  selector: 'app-movements',
  imports: [FormField, Icon, TransactionRow],
  host: { class: 'flex flex-col gap-6' },
  template: `
    <header class="flex flex-col gap-2">
      <span class="eyebrow text-xs text-lime">Historial</span>
      <h1 tabindex="-1" class="m-0 font-display text-[clamp(28px,4vw,44px)] leading-none font-bold tracking-[-0.02em] outline-none">
        Movimientos
      </h1>
    </header>

    <div role="search" aria-label="Filtrar movimientos" class="glass grid gap-3 rounded-card p-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:p-5">
      <div>
        <label for="q" class="sr-only">Buscar por descripción</label>
        <div class="panel flex min-h-12 items-center gap-2 rounded-panel px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-lime">
          <app-icon name="search" class="size-4.5 text-subtle" />
          <input
            id="q"
            type="search"
            placeholder="Buscar: skins, gift card, @vale…"
            class="w-full bg-transparent text-fg outline-none placeholder:text-faint"
            [formField]="filters.query"
          />
        </div>
      </div>
      <div>
        <label for="cuenta" class="sr-only">Cuenta</label>
        <select id="cuenta" [class]="selectClass" [formField]="filters.account">
          <option value="todas">Todas las cuentas</option>
          @for (account of bank.accounts(); track account.id) {
            <option [value]="account.id">{{ account.name }}</option>
          }
        </select>
      </div>
      <div>
        <label for="categoria" class="sr-only">Categoría</label>
        <select id="categoria" [class]="selectClass" [formField]="filters.category">
          <option value="todas">Todas las categorías</option>
          @for (c of categories; track c.value) {
            <option [value]="c.value">{{ c.label }}</option>
          }
        </select>
      </div>
    </div>

    <p class="m-0 text-sm text-subtle" aria-live="polite">{{ resultLabel() }}</p>

    @if (groups().length) {
      <div class="flex flex-col gap-6">
        @for (group of groups(); track group.label) {
          <section [attr.aria-label]="group.label" class="glass rounded-card px-5 py-2 sm:px-7">
            <h2 class="m-0 pt-4 pb-1 eyebrow text-xs font-normal text-label">{{ group.label }}</h2>
            <ul class="m-0 list-none divide-y divide-white/6 p-0">
              @for (tx of group.items; track tx.id) {
                <li>
                  <app-transaction-row
                    [tx]="tx"
                    [currency]="bank.currencyOf(tx.accountId)"
                    [meta]="showAccount() ? bank.account(tx.accountId)?.currency : undefined"
                  />
                </li>
              }
            </ul>
          </section>
        }
      </div>
    } @else {
      <div class="glass flex flex-col items-center gap-4 rounded-card px-6 py-14 text-center">
        <span class="grid size-14 place-items-center rounded-2xl bg-violet/18 text-lilac">
          <app-icon name="search" class="size-6" />
        </span>
        <h2 class="m-0 font-display text-xl font-bold">Sin movimientos con esos filtros</h2>
        <p class="m-0 max-w-90 text-muted">Prueba con otra palabra, o revisa todas las cuentas y categorías.</p>
        <button
          type="button"
          class="inline-flex min-h-11 items-center gap-2 rounded-full bg-lime px-5 font-semibold text-ink transition hover:bg-lime-soft"
          (click)="clear()"
        >
          Limpiar filtros
        </button>
      </div>
    }
  `,
})
export class Movements {
  /** `?cuenta=pen|usd` preselects an account, e.g. when coming from the overview. */
  readonly cuenta = input<string>();

  protected readonly bank = inject(BankStore);
  private readonly now = inject(NOW);

  protected readonly categories = (Object.keys(CATEGORY_LABELS) as Category[]).map((value) => ({
    value,
    label: CATEGORY_LABELS[value],
  }));
  protected readonly selectClass =
    'panel min-h-12 w-full rounded-panel bg-ink-2 px-4 text-fg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime';

  /** Filters reset whenever the URL's account changes, but stay editable in between. */
  private readonly model = linkedSignal<Filters>(() => ({
    query: '',
    account: this.bank.account(this.cuenta() ?? '') ? this.cuenta()! : 'todas',
    category: 'todas',
  }));
  protected readonly filters = form(this.model);

  protected readonly showAccount = computed(() => this.model().account === 'todas');

  private readonly results = computed(() => {
    const { query, account, category } = this.model();
    const q = normalize(query);
    return this.bank
      .transactions()
      .filter(
        (t) =>
          (account === 'todas' || t.accountId === account) &&
          (category === 'todas' || t.category === category) &&
          (!q || normalize(t.description).includes(q)),
      );
  });

  protected readonly groups = computed<DayGroup[]>(() => {
    const now = this.now();
    const groups: DayGroup[] = [];
    for (const tx of this.results()) {
      const label = dayLabel(tx.date, now);
      const last = groups.at(-1);
      if (last?.label === label) groups[groups.length - 1] = { label, items: [...last.items, tx] };
      else groups.push({ label, items: [tx] });
    }
    return groups;
  });

  protected readonly resultLabel = computed(() => {
    const n = this.results().length;
    return n === 1 ? '1 movimiento' : `${n} movimientos`;
  });

  protected clear(): void {
    this.model.set({ query: '', account: 'todas', category: 'todas' });
  }
}
