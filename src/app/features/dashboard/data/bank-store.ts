import { Service, computed, effect, inject, signal } from '@angular/core';

import { NOW } from '../../../core/clock';
import { ExchangeRate } from '../../../core/exchange-rate';
import { LocalStore } from '../../../core/local-store';
import { Account, Contact, Currency, Transaction } from './models';
import { progressFor } from './progression';
import { CONTACTS, GAMES_MONTHLY_LIMIT, PREVIOUS_XP, SEED_ACCOUNTS, seedTransactions } from './seed';

const KEY = 'lvl.bank.v1';

interface BankState {
  readonly accounts: readonly Account[];
  readonly transactions: readonly Transaction[];
}

export type Destination =
  | { readonly kind: 'account'; readonly id: string }
  | { readonly kind: 'contact'; readonly id: string };

export interface TransferRequest {
  readonly fromId: string;
  readonly to: Destination;
  readonly amount: number;
  readonly note: string;
}

export interface TransferQuote {
  readonly debit: number;
  readonly debitCurrency: Currency;
  readonly credit: number;
  readonly creditCurrency: Currency;
  /** Soles per dollar used, or null when no conversion is needed. */
  readonly rate: number | null;
}

export interface TransferReceipt extends TransferQuote {
  readonly id: string;
  readonly date: string;
  readonly toLabel: string;
}

export class TransferError extends Error {}

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Simulated network latency so the UI has real pending states. */
export const TRANSFER_LATENCY_MS = 700;

@Service()
export class BankStore {
  private readonly storage = inject(LocalStore);
  private readonly now = inject(NOW);
  private readonly fx = inject(ExchangeRate);

  private readonly state = signal<BankState>(this.restore());

  readonly accounts = computed(() => this.state().accounts);
  readonly contacts: readonly Contact[] = CONTACTS;
  readonly usdToPen = this.fx.usdToPen;

  /** Newest first. */
  readonly transactions = computed(() =>
    [...this.state().transactions].sort((a, b) => b.date.localeCompare(a.date)),
  );

  readonly totalXp = computed(
    () => PREVIOUS_XP + this.state().transactions.reduce((sum, t) => sum + t.xp, 0),
  );
  readonly progress = computed(() => progressFor(this.totalXp()));

  /** Everything expressed in soles, or null until the exchange rate arrives. */
  readonly netWorthPen = computed(() => {
    const rate = this.usdToPen();
    if (rate === null) return null;
    return round2(this.accounts().reduce((sum, a) => sum + this.toPen(a.balance, a.currency, rate), 0));
  });

  /** Games spending in the current calendar month, in soles (USD converted when the rate is known). */
  readonly gamesSpentThisMonth = computed(() => {
    const now = this.now();
    const rate = this.usdToPen() ?? 0;
    return round2(
      this.state()
        .transactions.filter((t) => {
          const d = new Date(t.date);
          return t.category === 'juegos' && t.amount < 0 && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((sum, t) => sum - this.toPen(t.amount, this.currencyOf(t.accountId), rate), 0),
    );
  });
  readonly gamesMonthlyLimit = GAMES_MONTHLY_LIMIT;

  constructor() {
    effect(() => this.storage.set(KEY, this.state()));
  }

  account(id: string): Account | undefined {
    return this.accounts().find((a) => a.id === id);
  }

  /** What leaves the source account and what arrives at the destination. */
  quote(fromId: string, to: Destination, amount: number): TransferQuote | null {
    const from = this.account(fromId);
    if (!from) return null;
    const creditCurrency = to.kind === 'account' ? this.account(to.id)?.currency : from.currency;
    if (!creditCurrency) return null;
    if (creditCurrency === from.currency) {
      return { debit: amount, debitCurrency: from.currency, credit: amount, creditCurrency, rate: null };
    }
    const rate = this.usdToPen();
    if (rate === null) return null;
    const credit = from.currency === 'PEN' ? amount / rate : amount * rate;
    return { debit: amount, debitCurrency: from.currency, credit: round2(credit), creditCurrency, rate };
  }

  async transfer(request: TransferRequest): Promise<TransferReceipt> {
    await new Promise((resolve) => setTimeout(resolve, TRANSFER_LATENCY_MS));

    const from = this.account(request.fromId);
    if (!from) throw new TransferError('La cuenta de origen no existe.');
    if (request.to.kind === 'account' && request.to.id === from.id) {
      throw new TransferError('Elige una cuenta de destino distinta a la de origen.');
    }
    if (!(request.amount > 0)) throw new TransferError('El monto debe ser mayor a cero.');
    if (request.amount > from.balance) throw new TransferError('No tienes saldo suficiente en esa cuenta.');

    const quote = this.quote(from.id, request.to, request.amount);
    if (!quote) throw new TransferError('El tipo de cambio no está disponible. Intenta en unos segundos.');

    const toLabel = this.destinationLabel(request.to);
    const date = this.now().toISOString();
    const id = `tx-${Date.now().toString(36)}`;
    const note = request.note.trim();
    const description = (label: string) => (note ? `${label} · ${note}` : label);

    const movements: Transaction[] = [
      {
        id: `${id}-out`,
        accountId: from.id,
        date,
        description: description(`Transferencia a ${toLabel}`),
        category: 'transferencias',
        amount: -quote.debit,
        xp: 0,
      },
    ];
    if (request.to.kind === 'account') {
      movements.push({
        id: `${id}-in`,
        accountId: request.to.id,
        date,
        description: description(`Transferencia desde ${from.name.toLowerCase()}`),
        category: 'transferencias',
        amount: quote.credit,
        xp: 0,
      });
    }

    this.state.update((s) => ({
      transactions: [...s.transactions, ...movements],
      accounts: s.accounts.map((a) => {
        const delta = movements.filter((m) => m.accountId === a.id).reduce((sum, m) => sum + m.amount, 0);
        return delta === 0 ? a : { ...a, balance: round2(a.balance + delta) };
      }),
    }));

    return { ...quote, id, date, toLabel };
  }

  /** Restores the demo data. */
  reset(): void {
    this.state.set(this.seed());
  }

  destinationLabel(to: Destination): string {
    if (to.kind === 'account') return this.account(to.id)?.name.toLowerCase() ?? 'cuenta';
    return this.contacts.find((c) => c.id === to.id)?.handle ?? 'contacto';
  }

  currencyOf(accountId: string): Currency {
    return this.account(accountId)?.currency ?? 'PEN';
  }

  private toPen(amount: number, currency: Currency, rate: number): number {
    return currency === 'PEN' ? amount : amount * rate;
  }

  private seed(): BankState {
    return { accounts: SEED_ACCOUNTS, transactions: seedTransactions(this.now()) };
  }

  private restore(): BankState {
    const saved = this.storage.get(KEY);
    if (
      saved &&
      typeof saved === 'object' &&
      Array.isArray((saved as BankState).accounts) &&
      Array.isArray((saved as BankState).transactions)
    ) {
      return saved as BankState;
    }
    return this.seed();
  }
}
